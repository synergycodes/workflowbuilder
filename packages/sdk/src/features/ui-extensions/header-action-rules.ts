import type { WorkflowBuilderVersion } from '../../workflow-builder-root/workflow-builder-root.types';

// One rule for the action and its built-in control, so a control never offers what the action refuses.

/**
 * Clean up does nothing, and its built-in is disabled, in read-only mode or on an empty canvas.
 * Pending is checked apart: the built-in main button stays enabled while busy, so it keeps focus.
 */
export function isCleanUpBlocked({ isReadOnly, isCanvasEmpty }: { isReadOnly: boolean; isCanvasEmpty: boolean }) {
  return isReadOnly || isCanvasEmpty;
}

/** Publish runs, and its built-in is enabled, only for a supplied draft version. */
export function isVersionPublishable(version: WorkflowBuilderVersion | null | undefined) {
  return version?.isDraft === true;
}
