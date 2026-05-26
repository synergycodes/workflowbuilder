---
'@workflowbuilder/sdk': patch
---

fix: stabilize horizontal port Y on built-in node templates so multi-line descriptions no longer shift the port and bend edges between adjacent nodes. Unifies `<NodePanel.Handles alignment>` selection through one helper across all four built-in templates and pins the resulting port to the NodeIcon's vertical center via a global CSS rule scoped to a SDK-owned anchor class. Also fixes a separate latent bug where `DecisionNodeTemplate` hardcoded `Position.Right` on the source handle instead of honoring `layoutDirection` (broke decision nodes in `DOWN` layout).
