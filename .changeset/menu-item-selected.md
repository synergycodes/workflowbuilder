---
'@workflowbuilder/ui': minor
---

`Menu` items accept `selected`; a menu with a selection renders its entries as a radio group (`menuitemradio`, `aria-checked`) and highlights the current one. Selected list entries (menu items and `Select` options) use the design roles `ui/bg/selected` and `ui/bg/selected-hover` with default text instead of a solid accent fill; the new `--wb-public-list-item-background-color-selected-hover` property covers the hovered selected state.
