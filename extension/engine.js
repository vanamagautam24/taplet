globalThis.RustSnipsEngine = (() => {
  const encoder = new TextEncoder();
  let loading;
  return class Engine {
    constructor() {
      this.exports = null;
      this.keys = [];
      this.buffer = 0;
      this.keysPtr = 0;
      this.keysLen = 0;
    }
    async ready() {
      if (this.exports) return this;
      // Compile only once per frame, and only after a text field is used.
      loading ||= fetch(browser.runtime.getURL("core.wasm"))
        .then((r) => {
          if (!r.ok) throw Error("Rust engine unavailable");
          return r.arrayBuffer();
        })
        .then(WebAssembly.compile);
      const instance = await WebAssembly.instantiate(await loading, {});
      this.exports = instance.exports;
      this.buffer = this.exports.alloc(2048);
      this.configure(this.keys);
      return this;
    }
    configure(keys) {
      this.keys = keys;
      if (!this.exports) return;
      if (this.keysPtr) this.exports.dealloc(this.keysPtr, this.keysAllocation);
      const bytes = encoder.encode(keys.join("\n"));
      this.keysLen = bytes.length;
      this.keysPtr = this.exports.alloc(Math.max(1, this.keysLen));
      // Keep allocation length correct for the empty table too.
      this.keysAllocation = Math.max(1, this.keysLen);
      new Uint8Array(
        this.exports.memory.buffer,
        this.keysPtr,
        bytes.length,
      ).set(bytes);
    }
    find(text) {
      if (!this.exports || !this.keys.length) return -1;
      const bytes = encoder.encode(text);
      if (bytes.length > 2048) return -1;
      new Uint8Array(this.exports.memory.buffer, this.buffer, bytes.length).set(
        bytes,
      );
      const found = this.exports.find_shortcut(
        this.buffer,
        bytes.length,
        this.keysPtr,
        this.keysLen,
      );
      // Erase the temporary text immediately after matching. No typed-text history.
      new Uint8Array(
        this.exports.memory.buffer,
        this.buffer,
        bytes.length,
      ).fill(0);
      return found;
    }
  };
})();
