### Title: One properties form per node

### Proposed by: Jan Librowski

### Date: 16.11.2026

## Context

The properties panel kept one form tree for every selected node. State that lives inside the form (the JSON Forms copy of the data, the draft a text control keeps until blur, the internals of the Base UI `Select`) therefore carried over from one node to the next:

- Focusing a `Select` on one node and then selecting another node reset the second node's value, or replaced it with a value taken from a third node, and the change was saved.
- Text typed but not committed appeared in the next node's field and was written there on blur.
- An edit committed just before the selection changed was dropped.

The `Select` part comes from Base UI. Once its trigger has been focused it keeps the options mounted, and when the options change it looks for the value it held before the change. If the value and the options are replaced in the same render, it does not find the old value among the new options and reports `null`, or the value it was first mounted with.

## Decision

1. `NodeProperties` keys the form by node id, so every node gets its own form instance and nothing inside it outlives the node.
2. The operator `Select` in the conditions form is keyed by the type of the left operand. It is the one place inside a node where a value and its options change together.

## Rejected alternatives

- **Changing `Select` in the UI library to report only what the user picks.** It removes the cause for every usage, but it changes behaviour for all consumers of the library (a letter typed on a closed `Select` would no longer change its value) and needs a release of a second package. Left as a possible later step.
- **Ignoring `Select` changes whose reason is `none`.** Base UI reports its own reset and a letter typed on a closed trigger the same way, so the filter cannot tell them apart.
- **Upgrading Base UI.** The reset behaves the same in 1.7.0 and 1.9.0, and 1.9.0 also drops the guard that skipped option lists of equal length.
- **Making the form report only edits made by its controls.** JSON Forms middleware can tell a control edit from a data sync, which would replace the comparison in `NodeProperties`. It is a larger change to the write path and is deferred.

## Consequences

- Collapsed sections of the form no longer stay collapsed from one node to the next.
- Text typed into a field is committed on blur. If the selection changes without a blur, the draft is dropped instead of reaching another node.
- A new place that replaces the value and the options of one `Select` in the same render needs its own key.
