---
'@workflowbuilder/ui': minor
---

A selected `Menu` item or `Select` option renders a check mark at the trailing edge of the row, so the choice is not carried by background colour alone. Icons inside a list row take their own role instead of the label colour, through the new `--wb-public-list-item-icon-color`, `--wb-public-list-item-icon-color-disabled` and `--wb-public-list-item-indicator-color` properties.

`Menu` items accept `selected`; a menu with a selection renders its entries as a radio group (`menuitemradio`, `aria-checked`) and highlights the current one. Selected list entries (menu items and `Select` options) use the design roles `ui/bg/selected` and `ui/bg/selected-hover` with default text instead of a solid accent fill; the new `--wb-public-list-item-background-color-selected-hover` property covers the hovered selected state. A hovered list entry takes the `ui/bg/inset` role, the same surface the checkbox, radio and switch already used. A disabled entry follows the design library too: it keeps that surface instead of going transparent, and its label takes `ui/text/disabled` instead of the input's disabled colour. Both are exposed as `--wb-public-list-item-background-color-disabled` and `--wb-public-list-item-color-disabled`, so an override that used to reach disabled menu entries through `--wb-public-input-color-disabled` moves to the second one.
