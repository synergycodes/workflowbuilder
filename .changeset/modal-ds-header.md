---
'@workflowbuilder/ui': minor
---

`Modal` matches the design system's Modal: the header icon sits in an outlined tile instead of a brand-filled one, the dialog has a 1px border (`--wb-public-modal-border-color`, `--wb-public-modal-icon-border-color`), a large modal's close button is 42px, a regular modal's title uses Title M and the subtitle sits right under the title. The new `initialFocus` prop picks the element focused on open, for example the dialog itself when it opens without a click.
