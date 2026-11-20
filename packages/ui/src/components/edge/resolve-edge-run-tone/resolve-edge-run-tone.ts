import { isCssNamePart } from '../../../shared/utils/css-name';
import type { EdgeRunState, EdgeRunTone, EdgeRunToneName } from '../types';

export const DEFAULT_EDGE_RUN_TONE: Record<EdgeRunState, EdgeRunTone> = {
  pending: 'default',
  running: 'active',
  completed: 'success',
  outOfRun: 'disabled',
};

/**
 * The tone an edge is drawn in: `tone` when it is a valid CSS name part, otherwise the default tone of
 * `runState` (`pending` → `default`, `running` → `active`, `completed` → `success`, `outOfRun` → `disabled`).
 * `undefined` without a `runState`, because a tone applies only under a run state.
 */
export function resolveEdgeRunTone(runState?: EdgeRunState, tone?: string): EdgeRunToneName | undefined {
  if (!runState) return undefined;
  return isCssNamePart(tone) ? tone : DEFAULT_EDGE_RUN_TONE[runState];
}
