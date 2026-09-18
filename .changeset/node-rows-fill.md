---
'@workflowbuilder/sdk': patch
---

Decision branch rows and AI tool rows fill the width their section offers, as the design library's `Node / Row` does, instead of capping it with a width derived from the node shell. At the default node width a row measures 205px. Long labels truncate at the section edge instead of overflowing it, and branch rows are spaced with the node body gap (8px) like tool rows. The derived cap survives only in the vertical (DOWN) layout, where a branch row has no design master and an uncapped label would widen the node.
