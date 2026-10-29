# Privacy

Taplet runs inside your browser. It has no account system, analytics, remote API, cloud synchronization, or separate server.

The extension stores snippet names, shortcuts, expansion text, the enabled setting, and the selected interface theme in this browser profile's `storage.local`. It does not use `storage.sync`. Exporting a backup writes the snippet library to a JSON file you choose to keep; importing replaces the library after confirmation. The practice field is never saved.

To replace shortcuts, the content script handles input events in supported editable fields on HTTP and HTTPS pages. It examines at most 256 characters immediately before the cursor. The Rust matcher receives that short context through WebAssembly memory and clears the temporary bytes immediately after matching. Typed context is not logged, stored, or sent over a network. JavaScript strings and the page's own input content remain subject to normal browser memory management; this is not a secure-memory guarantee.

Password fields, one-time-code fields, and payment fields identified by their input type or autocomplete attributes are excluded. Read-only fields and elements marked `data-rust-snips="off"` are also excluded. Sites that fail to label sensitive fields correctly may be indistinguishable from ordinary text fields. You can pause expansion from the extension popup or editor.

## Permissions

- **Storage** saves your library and preferences on this device.
- **Access to HTTP/HTTPS pages** lets the content script expand shortcuts in editable fields. It does not collect browsing history, read cookies, or send page content elsewhere. The extension uses no background script.
- **WebAssembly** runs the bundled Rust matcher. Its only fetch loads the packaged `core.wasm` file from the extension itself.

This privacy description covers Taplet, not the websites or browser in which you use it. A website can receive text entered into its own fields, including an expanded snippet.

Mozilla signing and GitHub distribution are separate from normal runtime behavior. Submitting a release for signing sends the extension package and requested build sources to Mozilla. Publishing this repository makes its source and bundled example snippets public. Neither process requires uploading your saved snippet library.
