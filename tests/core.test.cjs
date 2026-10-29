const { readFileSync } = require("node:fs");
const { resolve } = require("node:path");
const vm = require("node:vm");
const assert = require("node:assert/strict");
const { webcrypto } = require("node:crypto");
const root = resolve(__dirname, "..");
let stored;
const sandbox = {
  console,
  crypto: webcrypto,
  TextEncoder,
  WebAssembly,
  Uint8Array,
  fetch: async () => ({
    ok: true,
    arrayBuffer: async () => readFileSync(resolve(root, "extension/core.wasm")),
  }),
  browser: {
    runtime: { getURL: (x) => x },
    storage: {
      local: {
        get: async () => ({ settings: stored }),
        set: async (v) => {
          stored = v.settings;
        },
      },
    },
  },
};
vm.createContext(sandbox);
for (const file of ["defaults.js", "schema.js", "engine.js"])
  vm.runInContext(
    readFileSync(resolve(root, "extension", file), "utf8"),
    sandbox,
  );
(async () => {
  const schema = sandbox.RustSnipsSchema;
  const defaults = await schema.load();
  assert.equal(defaults.snippets[0].shortcut, "/hello");
  assert.equal(defaults.snippets.length, 1);
  assert(defaults.snippets[0].body.startsWith("Hello!"));
  assert(defaults.snippets[0].body.length < 100);
  assert.throws(
    () =>
      schema.validate({
        ...defaults,
        snippets: [...defaults.snippets, ...defaults.snippets],
      }),
    /already used/,
  );
  assert.throws(
    () =>
      schema.validate({
        ...defaults,
        snippets: [{ ...defaults.snippets[0], shortcut: "/bad key" }],
      }),
    /without spaces/,
  );
  await schema.save({ ...defaults, enabled: false });
  assert.equal((await schema.load()).enabled, false);
  const engine = new sandbox.RustSnipsEngine();
  engine.configure(["/sample", "/你好"]);
  await engine.ready();
  assert.equal(engine.find("/sample"), 0);
  assert.equal(engine.find("hello /sample"), 0);
  assert.equal(engine.find("https://sample"), -1);
  assert.equal(engine.find("🙂 /你好"), 1);
  assert.equal(engine.find("/sam"), -1);
  assert.equal(engine.find("/SAMPLE"), -1);
  const scratch = new Uint8Array(
    engine.exports.memory.buffer,
    engine.buffer,
    2048,
  );
  assert(
    scratch.every((x) => x === 0),
    "typed context must be erased",
  );
  for (let i = 0; i < 200; i++) {
    engine.configure([]);
    assert.equal(engine.find("/sample"), -1);
    engine.configure(["/new"]);
    assert.equal(engine.find("/new"), 0);
  }
  console.log(
    "Rust WASM, Unicode/boundary matching, scratch erasure, settings and validation checks passed.",
  );
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
