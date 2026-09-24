---
'@workflowbuilder/ui': major
'@workflowbuilder/sdk': major
---

The public component override surface moves from the `--ax-public-*` prefix to `--wb-public-*`, with no compatibility aliases.

Breaking changes:

- Replace the `--ax-public-` prefix with `--wb-public-` in every consumer override.
- The prefix alone is not always enough: the button, input, text area and select families also rename variant names and size suffixes in the same release, and some properties are removed outright. Check each overridden name against the 3.0 upgrade guide rather than renaming the prefix mechanically.
