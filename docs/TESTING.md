# Browser checks

Use a separate empty profile without accounts or private browsing data. Build the extension, load it temporarily through `about:debugging`, and open the studio from the extension menu. Remote debugging is not necessary for these manual checks.

1. In the practice field, type `/hello` and check that the default greeting replaces it. Undo should restore `/hello` without expanding again.
2. Drag the model and use its arrow-key controls, zoom buttons, and reset button. Press its key and verify that the output changes through the Rust matcher. Click the text card for the full preview. The callouts should focus the shortcut/text fields; the chip should open the highlighted practice field. Preview should open a modal with the full expansion, including unsaved edits. Close it with Escape or its Close button. Its Try typing button should close the modal, scroll the practice field into view, focus/select the field, and highlight the practice card. Confirm that typed shortcuts still expand there.
3. Pick a starter. It should remain unsaved until Save is pressed. Save it and type its trigger in practice. Refresh the studio and verify persistence.
4. Pause expansion and type a saved trigger. It should stay as typed. Resume and try again in a cleared field.
5. Search the library, select a result, edit it, save it, and verify the changed expansion. Delete the test snippet and accept confirmation.
6. Export a backup, add a disposable snippet, then import the backup and confirm replacement. The original library should return.
7. Switch the theme and reload. Check that the theme persists. At a narrow viewport, verify that content fits and all editor controls remain reachable.
8. On a normal local HTTP test page, try a text input, textarea, controlled input, and contenteditable editor. Check multiline text, Unicode, caret position, and native Undo. Verify that `https://hello`, partial triggers, pasting, password fields, OTP/payment autocomplete fields, read-only fields, and `data-rust-snips="off"` fields do not expand.
9. With reduced motion enabled, previews should remain usable without movement. Tab through controls and check visible focus, labels, and keyboard activation.

These checks do not establish support for every website's custom editor. Report the browser version, field type/site, exact trigger, and reproduction steps when filing a compatibility issue. Avoid attaching saved libraries containing private text.
