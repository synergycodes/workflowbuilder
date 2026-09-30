---
'@workflowbuilder/sdk': minor
---

Node icons are a 36px square with an 18px glyph (46px and 24px before): `--wb-public-node-icon-padding` defaults to 8px and the new `--wb-public-node-icon-glyph-size` sets the glyph. The AI Agent icon uses the `ai` accent gradient, and `Icon` takes `size="inherit"` to follow the surrounding font size.

Breaking changes:

- In custom node templates render the icon inside `NodeIcon` with `size="inherit"` instead of `size="large"`, otherwise the glyph stays 24px.
