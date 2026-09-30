---
'@workflowbuilder/sdk': minor
---

Node icons are a 36px square with an 18px glyph (46px and 24px before), and the AI Agent icon uses the `ai` accent gradient. `--wb-public-node-icon-padding` defaults to 8px (10px before) and the new `--wb-public-node-icon-glyph-size` sets the glyph. `Icon` takes `size="inherit"` to follow the surrounding font size.

Migration for custom node templates: render the icon inside `NodeIcon` with `size="inherit"` instead of `size="large"`, otherwise the glyph stays 24px.
