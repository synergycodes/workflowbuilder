---
'@workflowbuilder/sdk': major
---

The SDK no longer resets the font of the whole document. Typography is bound to the built-in type roles and to the public `--wb-public-font-family` lever, so setting that one variable rethemes both the roles and the builder root. Small text on SDK surfaces takes an explicit 10px, 11px or 12px role per surface, including the 12px code editor text that now matches the code role.

Breaking changes:

- Host pages that relied on the SDK stylesheet setting their font must set it themselves; the SDK only styles its own subtree now.
- Set `--wb-public-font-family` instead of overriding font declarations on SDK elements. The previous per-element overrides no longer reach every surface.
