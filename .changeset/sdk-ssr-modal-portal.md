---
'@workflowbuilder/sdk': patch
---

`ModalProvider` no longer touches `document` during server-side rendering; the modal portal mounts after hydration. Fixes `ReferenceError: document is not defined` when the editor renders in SSR frameworks such as Next.js.
