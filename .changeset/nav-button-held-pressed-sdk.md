---
'@workflowbuilder/sdk': major
---

**Breaking.** Editor header buttons and menu triggers no longer flash the brand-filled Active state while held down: they show Pressed, as in `@workflowbuilder/ui`. `--wb-public-nav-button-background-color-active` and `--wb-public-nav-button-color-active` are removed: restyle the held state with `--wb-public-nav-button-background-color-pressed` and `--wb-public-nav-button-color-pressed`.
