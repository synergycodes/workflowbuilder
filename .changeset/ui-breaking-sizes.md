---
'@workflowbuilder/ui': major
---

**Breaking.** Every size uses one scale of short codes, `xxxs | xxs | xs | s | m | l | xl`, and the prop is always `size`: replace `'extra-large'`, `'large'`, `'medium'`, `'small'`, `'extra-small'`, `'xx-small'` and `'xxx-small'` with `'xl'`, `'l'`, `'m'`, `'s'`, `'xs'`, `'xxs'` and `'xxxs'` (this covers `SIZES`, `Size`, `ItemSize`, `SelectorSize`, `EdgeLabelSize`, `EDGE_LABEL_SIZES`, `Avatar` and `SegmentPicker`), rename `DatePicker`'s `inputSize` to `size`, use `size="m" | "l"` on `Modal` instead of `"regular" | "large"`, and drop `size` from `MenuItemProps` (`Menu` sizes its rows). Defaults are unchanged (`m`, `Avatar` `xl`). Public CSS variables keep their size words, for example `--wb-public-checkbox-size-extra-small` styles `size="xs"`.
