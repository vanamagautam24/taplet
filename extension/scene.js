globalThis.RustSnipsScene = ({ getDraft, preview, status }) => {
  const $ = (id) => document.getElementById(id);
  const model = $("scene-model");
  const engine = new RustSnipsEngine();
  let x = 0,
    y = 0,
    zoom = 1,
    drag,
    lastDrag = 0;
  const clamp = (value, low, high) => Math.min(high, Math.max(low, value));
  function render() {
    model.style.setProperty("--model-x", `${x}deg`);
    model.style.setProperty("--model-y", `${y}deg`);
    model.style.setProperty("--model-scale", zoom);
    model.dataset.rotation = `${x},${y}`;
    const label = `${Math.round(zoom * 100)}%`;
    if ($("scene-zoom-value").textContent !== label)
      $("scene-zoom-value").textContent = label;
  }
  function scale(delta) {
    zoom = clamp(Math.round((zoom + delta) * 100) / 100, 0.7, 1.25);
    render();
  }
  $("scene-zoom-in").addEventListener("click", () => scale(0.1));
  $("scene-zoom-out").addEventListener("click", () => scale(-0.1));
  $("scene-reset").addEventListener("click", () => {
    x = 0;
    y = 0;
    zoom = 1;
    render();
  });
  model.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    drag = {
      id: event.pointerId,
      left: event.clientX,
      top: event.clientY,
      x,
      y,
      moved: false,
    };
    if (!event.target.closest('button,[role="button"]'))
      model.focus({ preventScroll: true });
  });
  model.addEventListener("pointermove", (event) => {
    if (!drag || event.pointerId !== drag.id) return;
    const dx = event.clientX - drag.left,
      dy = event.clientY - drag.top;
    if (!drag.moved && Math.hypot(dx, dy) < 5) return;
    if (!drag.moved) {
      drag.moved = true;
      model.setPointerCapture(event.pointerId);
      model.classList.add("is-dragging");
    }
    x = clamp(drag.x - dy * 0.16, -25, 25);
    y = clamp(drag.y + dx * 0.16, -30, 30);
    render();
    event.preventDefault();
  });
  function stopDrag(event) {
    if (!drag || drag.id !== event.pointerId) return;
    if (drag.moved) lastDrag = Date.now();
    if (model.hasPointerCapture(event.pointerId))
      model.releasePointerCapture(event.pointerId);
    model.classList.remove("is-dragging");
    drag = null;
  }
  model.addEventListener("pointerup", stopDrag);
  model.addEventListener("pointercancel", stopDrag);
  model.addEventListener(
    "click",
    (event) => {
      if (Date.now() - lastDrag < 350) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    },
    true,
  );
  model.addEventListener("keydown", (event) => {
    if (event.target !== model) return;
    if (event.key === "ArrowLeft") y = clamp(y - 4, -30, 30);
    else if (event.key === "ArrowRight") y = clamp(y + 4, -30, 30);
    else if (event.key === "ArrowUp") x = clamp(x - 4, -25, 25);
    else if (event.key === "ArrowDown") x = clamp(x + 4, -25, 25);
    else if (event.key === "+" || event.key === "=") {
      scale(0.1);
      event.preventDefault();
      return;
    } else if (event.key === "-") {
      scale(-0.1);
      event.preventDefault();
      return;
    } else if (event.key === "Home") {
      x = y = 0;
      zoom = 1;
    } else return;
    event.preventDefault();
    render();
  });
  $("keycap").addEventListener("click", async () => {
    const draft = getDraft();
    try {
      RustSnipsSchema.validate({
        version: 1,
        enabled: true,
        snippets: [{ ...draft, id: "model-demo", enabled: true }],
      });
    } catch (error) {
      status(error.message, true);
      return;
    }
    $("keycap").disabled = true;
    $("board-preview").textContent = draft.shortcut;
    $("board-caption").textContent = `Expanding ${draft.shortcut}…`;
    $("board").classList.add("animating");
    try {
      engine.configure([draft.shortcut]);
      await engine.ready();
      await new Promise((resolve) => setTimeout(resolve, 180));
      const current = getDraft();
      if (current.shortcut !== draft.shortcut || current.body !== draft.body)
        return;
      if (engine.find(draft.shortcut) !== 0)
        throw Error("The shortcut could not be matched.");
      $("board-preview").textContent = draft.body;
      $("board-caption").textContent =
        `Expanded ${draft.shortcut} → ${draft.body.length.toLocaleString()} characters. Click the text card to read it all.`;
      $("board").dataset.modelExpanded = draft.shortcut;
      status("The model ran your shortcut through the local Rust matcher.");
    } catch (error) {
      status(error.message, true);
    } finally {
      $("keycap").disabled = false;
      setTimeout(() => $("board").classList.remove("animating"), 1200);
    }
  });
  $("model-output").addEventListener("click", preview);
  $("model-output").addEventListener("keydown", (event) => {
    if (["Enter", " "].includes(event.key)) {
      event.preventDefault();
      preview();
    }
  });
  render();
};
