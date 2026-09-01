---
'@workflowbuilder/sdk': major
---

Remove the document-wide font reset and bind built-in typography to the public `--wb-public-font-family` lever. Set the public family variable to retheme both type roles and the builder root. Small text on affected SDK surfaces now uses explicit 10px, 11px, or 12px roles according to each surface, including 12px code editor text that matches the code role.
