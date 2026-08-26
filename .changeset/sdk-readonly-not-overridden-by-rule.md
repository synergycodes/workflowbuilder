---
'@workflowbuilder/sdk': minor
---

Form-wide readonly mode is no longer overridden by a local uischema `rule`. Every JSON Form control now stays non-editable while `config.readonly` is `true`, even when a rule with an `ENABLE` effect applies to it.
