---
'@workflowbuilder/ui': major
---

**Breaking.** `Accordion`, `Collapsible` and `Tooltip` name their open state `open`, `defaultOpen` and `onOpenChange(open)`, as Base UI does: rename `Accordion`'s `isOpen` and `onToggleOpen`, `Collapsible`'s `isExpanded`, `defaultExpanded` and `onToggle`, and `Tooltip`'s `initialOpen`. Defaults are unchanged: `Accordion` starts open, `Collapsible` closed.
