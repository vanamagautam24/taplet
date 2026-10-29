document.addEventListener("DOMContentLoaded", async () => {
  const enabled = document.getElementById("enabled"),
    status = document.getElementById("status");
  try {
    let settings = await RustSnipsSchema.load();
    enabled.checked = settings.enabled;
    for (const s of settings.snippets.filter((s) => s.enabled).slice(0, 5)) {
      const row = document.createElement("div");
      row.className = "quick-snippet";
      const label = document.createElement("span");
      label.textContent = s.name;
      const key = document.createElement("code");
      key.textContent = s.shortcut;
      row.append(label, key);
      document.getElementById("quick-list").append(row);
    }
    enabled.addEventListener("change", async () => {
      try {
        settings = await RustSnipsSchema.save({
          ...(await RustSnipsSchema.load()),
          enabled: enabled.checked,
        });
      } catch (e) {
        status.textContent = e.message;
        enabled.checked = settings.enabled;
      }
    });
    document.getElementById("editor").addEventListener("click", () => {
      browser.runtime.openOptionsPage();
      window.close();
    });
  } catch (e) {
    status.textContent = e.message;
  }
});
