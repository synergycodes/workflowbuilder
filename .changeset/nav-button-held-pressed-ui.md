---
'@workflowbuilder/ui': major
---

**Breaking.** A held `NavButton`, `Menu.TriggerButton` included, now shows the Pressed look instead of the brand-filled Active look, so a click no longer flashes Active. `--wb-public-nav-button-background-color-active` and `--wb-public-nav-button-color-active` are removed: restyle the held state with `--wb-public-nav-button-background-color-pressed` and `--wb-public-nav-button-color-pressed`.
