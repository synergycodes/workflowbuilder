---
'@workflowbuilder/sdk': patch
---

Connectable node items (Decision branches, AI tools) size their width from the real shell and section insets instead of a fixed multiple of the node padding, so labels keep the full available width after the node shell spacing change. Containers that wrap connectable items can declare their horizontal inset with `--wb-sdk-connectable-item-inset`.
