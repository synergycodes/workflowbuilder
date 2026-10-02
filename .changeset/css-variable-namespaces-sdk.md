---
'@workflowbuilder/sdk': major
---

SDK custom properties are split into a public override surface and a private one. The public controls take the `--wb-public-` prefix; everything else moves to `--wb-sdk-` and is no longer part of the supported surface.

Breaking changes:

- Rename `--wb-background-color` to `--wb-public-background-color`, `--wb-font-family` to `--wb-public-font-family`, `--wb-transition` to `--wb-public-transition`, and the supported `--wb-scroll-*` properties to `--wb-public-scroll-*`; the previously documented `--wb-scroll-thumb-hover-color` was never consumed and has no counterpart.
- Drop overrides of any other `--wb-<name>` property. They now live under `--wb-sdk-<name>`, which is private and may change without a major release.
