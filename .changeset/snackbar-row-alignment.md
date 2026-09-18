---
'@workflowbuilder/ui': patch
---

Snackbar centres its row, so the message sits level with the icon and the close button. The row had no vertical alignment, which left the message at the top while the taller close button set the row height; the text rendered 6px above everything else. A snackbar with a subtitle keeps its icon aligned to the first line, as the design library draws it.
