---
'@workflowbuilder/sdk': patch
---

The code editor in the Import and Export windows no longer tries to start an Ace web worker when it opens, which a Content Security Policy without `worker-src blob:` reported as a violation. The SDK now sets Ace's session default `useWorker` to `false`; an app that shares the same `ace-builds` instance and wants a worker must set `useWorker: true` on its own editors.
