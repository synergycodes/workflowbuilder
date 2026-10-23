// One id per runner change that an older recorded run did not make. The id is written
// into the engine's history, so a released one never changes.
// 'wb-running-status-at-start': from @workflowbuilder/temporal 0.3.0, removable at 1.0.
export type PatchId = 'wb-running-status-at-start';

// Graph runner asks this before a change that would break replay of an older run.
// Temporal answers through `patched()`; an engine without recorded runs answers true.
export interface VersioningPort {
  isPatched(patchId: PatchId): boolean;
}
