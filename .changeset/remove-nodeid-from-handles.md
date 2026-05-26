---
'@workflowbuilder/sdk': major
---

refactor!: drop `nodeId` from handle IDs. xyflow scopes handle IDs by their
owning node, so embedding the node id in the string was redundant.

Breaking changes:

- `getHandleId({ nodeId, handleType, innerId? })` is now `getHandleId({ handleType, innerId? })`.
  The returned ID is `<handleType>` for outer handles and `<handleType>:inner:<innerId>` for
  inner handles. Update every call site to drop the `nodeId` argument.
- The `HandleId` type narrowed accordingly: `OuterHandleId = 'source' | 'target'`,
  `InnerHandleId = 'source:inner:${string}' | 'target:inner:${string}'`.
- `ConnectableItem` no longer accepts `{ nodeId, innerId, handleType }`. Pass the
  pre-built `handleId` directly (use `getHandleId` to construct it).

Persisted diagrams: edges saved with the previous format
(`<nodeId>:<handleType>[:inner:<innerId>]`) will no longer resolve their
endpoints after upgrading. No automatic migration is provided. Re-save affected
diagrams in a build of the previous SDK, transform them externally, or rebuild
them in the new format before upgrading.
