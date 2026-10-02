---
'@workflowbuilder/sdk': major
---

The public component override surface moves from the `--ax-public-*` prefix to `--wb-public-*`, with no compatibility aliases.

Breaking changes:

- Replace the `--ax-public-` prefix with `--wb-public-` in every consumer override.
- Check each overridden name against the 3.0 upgrade guide's CSS custom property renames and removed-property list rather than renaming the prefix mechanically.
