globalThis.RustSnipsSchema = (() => {
  function validate(value) {
    if (!value || value.version !== 1 || !Array.isArray(value.snippets))
      throw Error("Choose a Rust Snips JSON backup (version 1).");
    if (value.snippets.length > 200) throw Error("The limit is 200 snippets.");
    const keys = new Set(),
      ids = new Set();
    const snippets = value.snippets.map((s) => {
      if (
        !s ||
        typeof s.name !== "string" ||
        !s.name.trim() ||
        s.name.length > 120
      )
        throw Error("Give every snippet a name (up to 120 characters).");
      if (
        typeof s.shortcut !== "string" ||
        !/^[\/;!][^\s\p{C}]{1,47}$/u.test(s.shortcut)
      )
        throw Error(
          "Shortcuts start with /, ; or ! and contain 2–48 characters, without spaces.",
        );
      if (keys.has(s.shortcut))
        throw Error(`The shortcut ${s.shortcut} is already used.`);
      if (typeof s.body !== "string" || !s.body || s.body.length > 100000)
        throw Error("Snippet text must contain 1–100,000 characters.");
      keys.add(s.shortcut);
      const id =
        typeof s.id === "string" && s.id.length <= 80
          ? s.id
          : crypto.randomUUID();
      if (ids.has(id)) throw Error("A snippet ID is duplicated.");
      ids.add(id);
      return {
        id,
        name: s.name.trim(),
        shortcut: s.shortcut,
        body: s.body,
        enabled: s.enabled !== false,
      };
    });
    const result = { version: 1, enabled: value.enabled !== false, snippets };
    if (JSON.stringify(result).length > 2000000)
      throw Error("The backup is too large (2 MB maximum).");
    return result;
  }
  async function load() {
    const { settings } = await browser.storage.local.get("settings");
    return validate(settings || RustSnipsDefaults);
  }
  async function save(value) {
    const settings = validate(value);
    await browser.storage.local.set({ settings });
    return settings;
  }
  return { validate, load, save };
})();
