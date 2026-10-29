(() => {
  const $ = (id) => document.getElementById(id);
  let data,
    selected,
    dirty = false,
    animationTimer;
  function status(message, error = false) {
    $("status").textContent = message;
    $("status").className = error ? "error" : "";
  }
  function counts() {
    const length = $("body").value.length;
    $("char-count").textContent = `${length.toLocaleString()} characters`;
    $("board-shortcut").textContent = $("shortcut").value || "/…";
    $("board-name").textContent = $("name").value || "Your next shortcut";
    $("board-preview").textContent =
      $("body").value ||
      "Write something you type a lot. Your full thought will appear here.";
    $("preview-length").textContent = `${length.toLocaleString()} CHARACTERS`;
    $("save-state").textContent = dirty ? "UNSAVED" : "SAVED";
    $("save-state").classList.toggle("draft", dirty);
  }
  function draft() {
    dirty = true;
    counts();
  }
  function animate(message) {
    clearTimeout(animationTimer);
    $("board").classList.remove("animating");
    // Restart this short animation on demand; there is no continuous render loop.
    void $("board").offsetWidth;
    $("board").classList.add("animating");
    $("board-caption").textContent = message;
    animationTimer = setTimeout(() => {
      $("board").classList.remove("animating");
      $("board-caption").textContent =
        "Click a part to explore. Your text stays here.";
    }, 2200);
  }
  function focus(id) {
    $(id).focus();
    $(id).scrollIntoView({ block: "nearest" });
  }
  function wires() {
    const board = $("board"),
      b = board.getBoundingClientRect();
    if (!b.width || !b.height) return;
    const key = $("keycap").getBoundingClientRect(),
      chip = $("engine-focus").getBoundingClientRect(),
      output = document.querySelector(".output-card").getBoundingClientRect();
    const points = [
      [(key.left + key.right) / 2 - b.left, key.bottom - b.top],
      [chip.left - b.left, (chip.top + chip.bottom) / 2 - b.top],
      [chip.right - b.left, (chip.top + chip.bottom) / 2 - b.top],
      [output.left + output.width * 0.65 - b.left, output.top - b.top],
    ];
    const svg = document.querySelector(".board-wires");
    svg.setAttribute("viewBox", `0 0 ${b.width} ${b.height}`);
    document
      .querySelector(".signal-one")
      .setAttribute("d", `M${points[0]} V${points[1][1]} H${points[1][0]}`);
    document
      .querySelector(".signal-two")
      .setAttribute("d", `M${points[2]} H${points[3][0]} V${points[3][1]}`);
    svg.querySelectorAll(".socket:not(.decorative)").forEach((dot, i) => {
      dot.setAttribute("cx", points[i][0]);
      dot.setAttribute("cy", points[i][1]);
    });
  }
  function drawList() {
    const q = $("search").value.toLowerCase();
    $("list").replaceChildren();
    for (const s of data.snippets.filter((s) =>
      `${s.name} ${s.shortcut}`.toLowerCase().includes(q),
    )) {
      const button = document.createElement("button");
      button.textContent = s.name + (s.enabled ? "" : " · paused");
      button.setAttribute("aria-current", String(s.id === selected));
      const key = document.createElement("small");
      key.textContent = s.shortcut;
      button.append(key);
      button.addEventListener("click", () => {
        if (leaveDraft()) select(s.id);
      });
      $("list").append(button);
    }
    if (!$("list").children.length) {
      const empty = document.createElement("p");
      empty.className = "empty";
      empty.textContent = "No shortcuts here yet. Add one with +.";
      $("list").append(empty);
    }
    const count = data.snippets.length;
    $("library-count").textContent =
      `${count} shortcut${count === 1 ? "" : "s"}`;
  }
  function select(id) {
    selected = id;
    const s = data.snippets.find((s) => s.id === id);
    $("name").value = s?.name || "";
    $("shortcut").value = s?.shortcut || "";
    $("body").value = s?.body || "";
    $("snippet-enabled").checked = s?.enabled !== false;
    $("delete").disabled = !s;
    dirty = false;
    drawList();
    counts();
    $("editor-title").textContent = s ? "Edit snippet" : "New snippet";
    $("practice-hint").textContent = s
      ? `Type ${s.shortcut} below. It expands as soon as you finish typing.`
      : "Save a shortcut, then try it below.";
    $("practice").value = "";
    $("practice-result").textContent = "Nothing here is sent or saved.";
  }
  function leaveDraft() {
    return !dirty || confirm("Discard the unsaved changes to this snippet?");
  }
  async function persist(value) {
    data = await RustSnipsSchema.save(value);
  }
  document.addEventListener("DOMContentLoaded", async () => {
    try {
      data = await RustSnipsSchema.load();
      $("enabled").checked = data.enabled;
      select(data.snippets[0]?.id || crypto.randomUUID());
      $("search").addEventListener("input", drawList);
      for (const id of ["name", "shortcut", "body", "snippet-enabled"])
        $(id).addEventListener("input", draft);
      $("add").addEventListener("click", () => {
        if (leaveDraft()) {
          select(crypto.randomUUID());
          $("name").focus();
        }
      });
      for (const id of ["keycap", "trigger-focus"])
        $(id).addEventListener("click", () => focus("shortcut"));
      $("text-focus").addEventListener("click", () => focus("body"));
      for (const id of ["engine-focus", "practice-focus"])
        $(id).addEventListener("click", () => focus("practice"));
      for (const [id, name] of [
        ["shortcut", "trigger"],
        ["body", "text"],
      ]) {
        $(id).addEventListener("focus", () =>
          $("board").classList.add(`highlight-${name}`),
        );
        $(id).addEventListener("blur", () =>
          $("board").classList.remove(`highlight-${name}`),
        );
      }
      $("demo").addEventListener("click", () => {
        if (!$("body").value) {
          status("Add some expansion text first.", true);
          focus("body");
          return;
        }
        animate(
          `${$("shortcut").value || "Your shortcut"} → ${$("body").value.length.toLocaleString()} characters. ${dirty ? "Preview only — save to use it." : "Ready when you are."}`,
        );
      });
      $("clear-practice").addEventListener("click", () => {
        $("practice").value = "";
        $("practice-result").textContent = "Nothing here is sent or saved.";
        focus("practice");
      });
      $("practice").addEventListener("input", (event) => {
        const snippet = data.snippets.find(
          (s) => s.enabled && s.body === event.data,
        );
        if (data.enabled && snippet && event.inputType === "insertText") {
          $("practice-result").textContent = "Expanded. All on your device.";
          animate(
            `${snippet.shortcut} → ${snippet.body.length.toLocaleString()} characters. That's your shortcut at work.`,
          );
        } else if (event.inputType === "historyUndo" || !$("practice").value)
          $("practice-result").textContent = "Nothing here is sent or saved.";
      });
      const templates = {
        explain: RustSnipsDefaults.snippets[0],
        thanks: {
          name: "A thoughtful reply",
          shortcut: "/thanks",
          body: "Thank you for taking the time to help with this. I really appreciate your thoughtfulness and support.",
        },
        steps: {
          name: "Make a plan",
          shortcut: "/steps",
          body: "Help me turn this into a practical plan. Start with the goal, break the work into small steps, explain what I need for each step, and suggest one thing I can do today.",
        },
      };
      for (const button of document.querySelectorAll("[data-template]"))
        button.addEventListener("click", () => {
          if (!leaveDraft()) return;
          const template = templates[button.dataset.template];
          let key = template.shortcut,
            suffix = 2;
          while (data.snippets.some((s) => s.shortcut === key))
            key = template.shortcut + suffix++;
          select(crypto.randomUUID());
          $("name").value = template.name;
          $("shortcut").value = key;
          $("body").value = template.body;
          draft();
          status("Starter loaded. Make it yours, then save.");
          focus("name");
        });
      function theme(value) {
        document.documentElement.dataset.theme =
          value === "night" ? "night" : "paper";
        $("theme").setAttribute(
          "aria-label",
          `Switch to ${value === "night" ? "light" : "dark"} theme`,
        );
      }
      browser.storage.local
        .get("uiTheme")
        .then(({ uiTheme }) => theme(uiTheme))
        .catch(() => {});
      $("theme").addEventListener("click", async () => {
        const value =
          document.documentElement.dataset.theme === "night"
            ? "paper"
            : "night";
        theme(value);
        try {
          await browser.storage.local.set({ uiTheme: value });
        } catch {
          status("Theme changed for this page; it could not be saved.", true);
        }
      });
      new ResizeObserver(wires).observe($("board"));
      $("save").addEventListener("click", async () => {
        try {
          const item = {
            id: selected,
            name: $("name").value,
            shortcut: $("shortcut").value,
            body: $("body").value,
            enabled: $("snippet-enabled").checked,
          };
          const snippets = data.snippets.filter((s) => s.id !== selected);
          snippets.push(item);
          await persist({ ...data, snippets });
          select(selected);
          status("Saved locally. Ready in your open tabs.");
        } catch (e) {
          status(e.message, true);
        }
      });
      $("delete").addEventListener("click", async () => {
        if (
          !confirm(
            "Delete this snippet? Export a backup first if you want to keep a copy.",
          )
        )
          return;
        try {
          await persist({
            ...data,
            snippets: data.snippets.filter((s) => s.id !== selected),
          });
          select(data.snippets[0]?.id || crypto.randomUUID());
          status("Snippet deleted.");
        } catch (e) {
          status(e.message, true);
        }
      });
      $("enabled").addEventListener("change", async () => {
        try {
          await persist({ ...data, enabled: $("enabled").checked });
          status(data.enabled ? "Expansion is on." : "Expansion is paused.");
        } catch (e) {
          $("enabled").checked = data.enabled;
          status(e.message, true);
        }
      });
      $("copy").addEventListener("click", async () => {
        try {
          await navigator.clipboard.writeText($("body").value);
          status("Text copied.");
        } catch {
          status("Select the expansion text and press Ctrl+C to copy.", true);
        }
      });
      $("export").addEventListener("click", () => {
        const blob = new Blob([JSON.stringify(data, null, 2)], {
          type: "application/json",
        });
        const url = URL.createObjectURL(blob),
          link = document.createElement("a");
        link.href = url;
        link.download = "rust-snips-backup.json";
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        status("Backup exported. Unsaved edits are excluded.");
      });
      $("import").addEventListener("click", () => {
        if (leaveDraft()) $("file").click();
      });
      $("file").addEventListener("change", async () => {
        try {
          const file = $("file").files[0];
          if (!file) return;
          if (file.size > 2000000)
            throw Error("The backup is too large (2 MB maximum).");
          const imported = RustSnipsSchema.validate(
            JSON.parse(await file.text()),
          );
          if (
            !confirm(
              `Replace your library with ${imported.snippets.length} snippets from this backup?`,
            )
          )
            return;
          await persist(imported);
          $("enabled").checked = data.enabled;
          select(data.snippets[0]?.id || crypto.randomUUID());
          status("Backup imported.");
        } catch (e) {
          status(e.message, true);
        } finally {
          $("file").value = "";
        }
      });
      window.addEventListener("beforeunload", (e) => {
        if (dirty) {
          e.preventDefault();
          e.returnValue = "";
        }
      });
    } catch (e) {
      status(e.message, true);
    }
  });
})();
