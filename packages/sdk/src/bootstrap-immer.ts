// Side-effect-only module: disables immer auto-freeze.
// Imported first from bootstrap.ts (must win the ES-module side-effect race).
import { setAutoFreeze } from 'immer';

// The diagram store uses `produce` (immer) to derive the next nodes/edges
// arrays. ReactFlow then mutates those objects directly (size, position,
// internal flags) under the hood — if immer's auto-freeze is on, those
// mutations throw `Cannot assign to read-only property` and the canvas dies.
//
// CAVEAT — this is a global toggle on the consumer's immer instance (immer
// is a peer dep, single instance shared across the host app). If the host
// relies on auto-frozen drafts elsewhere (their own reducers, RTK, …), this
// SDK turns that protection off app-wide. Documented in the SDK API page.
// Future cleanup: wrap each SDK `produce` call with a scoped enable/restore
// pair to contain the side effect — tracked separately.
setAutoFreeze(false);
