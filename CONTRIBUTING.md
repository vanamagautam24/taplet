# Contributing

Small, focused issues and pull requests are welcome. Explain the concrete problem, the resulting behavior, and how you verified it. For editor changes, include a screenshot at a desktop and a narrow viewport. For expansion changes, check both a textarea and a contenteditable field, caret position, Undo, Unicode, shortcut boundaries, and excluded sensitive fields.

Run `bash build.sh` before submitting changes. This runs Rust tests, compiles the actual WebAssembly matcher, verifies its JavaScript integration, and creates extension/source packages. See the README for browser checks; the build tests alone do not prove compatibility with every website's editor.

Keep all executable code bundled with the extension. Avoid network services, telemetry, remote scripts, and new dependencies unless a clear use case justifies changing the project's scope. Preserve reduced-motion support, keyboard access, visible focus indicators, and local backup/import.

Do not include API keys, saved snippet backups, browser profiles, cookies, personal test output, or another project's recovered assets in a contribution. By contributing, you agree to license your contribution under this repository's MIT license.
