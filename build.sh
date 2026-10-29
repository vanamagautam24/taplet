#!/usr/bin/env bash
set -euo pipefail
cd -- "$(dirname -- "$0")"
cargo test --offline
cargo build --offline --release --target wasm32-unknown-unknown
cp target/wasm32-unknown-unknown/release/rust_snips_core.wasm extension/core.wasm
node tests/core.test.cjs
python3 scripts/package.py
