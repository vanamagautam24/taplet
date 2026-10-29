(() => {
  const engine = new RustSnipsEngine();
  let settings,
    active = [],
    ready,
    changing = false,
    generation = 0;
  function configure(value) {
    settings = value;
    active = value.enabled ? value.snippets.filter((s) => s.enabled) : [];
    engine.configure(active.map((s) => s.shortcut));
    generation++;
  }
  const loaded = RustSnipsSchema.load()
    .then(configure)
    .catch(() => {
      active = [];
    });
  browser.storage.onChanged.addListener((changes, area) => {
    if (area !== "local" || !changes.settings) return;
    try {
      configure(
        RustSnipsSchema.validate(
          changes.settings.newValue || RustSnipsDefaults,
        ),
      );
    } catch {
      active = [];
      engine.configure([]);
    }
  });
  function field(event) {
    for (const el of event.composedPath()) {
      if (!(el instanceof HTMLElement)) continue;
      if (el.closest('[data-rust-snips="off"], [contenteditable="false"]'))
        return null;
      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
        if (
          el.disabled ||
          el.readOnly ||
          (el instanceof HTMLInputElement &&
            !["text", "search"].includes(el.type))
        )
          return null;
        if (/(?:password|one-time-code|cc-)/i.test(el.autocomplete))
          return null;
        return el;
      }
      if (el.isContentEditable) {
        let root = el;
        while (root.parentElement?.isContentEditable) root = root.parentElement;
        return root;
      }
    }
    return null;
  }
  function prepare() {
    ready ||= loaded
      .then(() => engine.ready())
      .catch(() => {
        console.warn(
          "Rust Snips: the local engine could not start. Reload the extension to retry.",
        );
        return null;
      });
    return ready;
  }
  document.addEventListener(
    "focusin",
    (event) => {
      if (field(event))
        loaded.then(() => {
          if (active.length) prepare();
        });
    },
    true,
  );
  // Warm the editor's own practice box before typing. Ordinary webpages still
  // initialize only when an eligible field is focused.
  if (location.protocol === "moz-extension:")
    loaded.then(() => {
      if (active.length) prepare();
    });

  function editableContext(root) {
    const sel = document.getSelection();
    if (!sel?.isCollapsed || !sel.rangeCount || !root.contains(sel.anchorNode))
      return null;
    const cursor = sel.getRangeAt(0).cloneRange();
    let scope =
      sel.anchorNode.nodeType === Node.ELEMENT_NODE
        ? sel.anchorNode
        : sel.anchorNode.parentElement;
    while (
      scope !== root &&
      !/^(P|DIV|LI|PRE|BLOCKQUOTE|H[1-6])$/.test(scope.tagName)
    )
      scope = scope.parentElement;
    const prefix = document.createRange();
    prefix.selectNodeContents(scope);
    prefix.setEnd(cursor.endContainer, cursor.endOffset);
    return { sel, cursor, scope, prefix, text: prefix.toString().slice(-256) };
  }
  function selectShortcut(context, length) {
    const offset = context.prefix.toString().length - length;
    if (offset < 0) return false;
    const walker = document.createTreeWalker(
      context.scope,
      NodeFilter.SHOW_TEXT,
    );
    let node,
      seen = 0;
    while ((node = walker.nextNode())) {
      if (seen + node.length >= offset) {
        const range = context.cursor.cloneRange();
        range.setStart(node, offset - seen);
        context.sel.removeAllRanges();
        context.sel.addRange(range);
        return true;
      }
      seen += node.length;
    }
    return false;
  }
  async function expand(root) {
    if (changing || !root.isConnected) return;
    await loaded;
    if (!active.length || !(await prepare())) return;
    // Read the current selection after loading: a fast typist may have moved on.
    if (!root.matches(":focus, :focus-within")) return;
    const version = generation;
    if (
      root instanceof HTMLInputElement ||
      root instanceof HTMLTextAreaElement
    ) {
      const end = root.selectionStart;
      if (end === null || end !== root.selectionEnd) return;
      const i = engine.find(root.value.slice(Math.max(0, end - 256), end));
      if (i < 0 || version !== generation) return;
      const snippet = active[i],
        start = end - snippet.shortcut.length;
      changing = true;
      try {
        root.setSelectionRange(start, end);
        if (!document.execCommand("insertText", false, snippet.body)) {
          // Native setters also notify controlled inputs through the input event.
          const proto =
            root instanceof HTMLTextAreaElement
              ? HTMLTextAreaElement.prototype
              : HTMLInputElement.prototype;
          const value =
            root.value.slice(0, start) + snippet.body + root.value.slice(end);
          Object.getOwnPropertyDescriptor(proto, "value").set.call(root, value);
          root.setSelectionRange(
            start + snippet.body.length,
            start + snippet.body.length,
          );
          root.dispatchEvent(
            new InputEvent("input", {
              bubbles: true,
              composed: true,
              inputType: "insertText",
              data: snippet.body,
            }),
          );
        }
      } finally {
        changing = false;
      }
    } else {
      const context = editableContext(root);
      if (!context) return;
      const i = engine.find(context.text);
      if (
        i < 0 ||
        version !== generation ||
        !selectShortcut(context, active[i].shortcut.length)
      )
        return;
      changing = true;
      try {
        if (!document.execCommand("insertText", false, active[i].body)) {
          context.sel.removeAllRanges();
          context.sel.addRange(context.cursor);
        }
      } finally {
        changing = false;
      }
    }
  }
  document.addEventListener(
    "input",
    (event) => {
      if (
        !event.isTrusted ||
        event.isComposing ||
        changing ||
        !["insertText", "insertCompositionText"].includes(event.inputType)
      )
        return;
      const root = field(event);
      if (root) queueMicrotask(() => expand(root));
    },
    true,
  );
  document.addEventListener(
    "compositionend",
    (event) => {
      const root = event.isTrusted && field(event);
      if (root) queueMicrotask(() => expand(root));
    },
    true,
  );
})();
