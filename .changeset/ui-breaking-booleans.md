---
'@workflowbuilder/ui': major
---

**Breaking.** Boolean props name the state without an `is` prefix: rename `Button`'s `isLoading` to `loading`, `NavButton`'s `isSelected` to `selected`, `EdgeLabel`'s and `useEdgeStyle`'s `isHovered` to `hovered`, `NodePanel.Content`/`Handles`/`Overlay`'s `isVisible` to `visible`, and `NodeAsPortWrapper`'s `isConnecting` to `connecting`. Props that repeated another one are gone: `Input`, `TextArea`, `Select` and `DatePicker` take `required` instead of `isRequired` (it also adds the label marker), `Select` and `DatePicker` take `state="critical"` instead of `error`, and `Snackbar` shows its close button whenever `onClose` is set, so drop `close` and leave `onClose` out to hide the button.
