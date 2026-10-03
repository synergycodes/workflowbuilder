import { hasText } from '../has-text';
import { isPlainObject } from '../is-plain-object';

/** What the person decided, read back from the node's completion. */
type DecisionOutcome = { edits: Record<string, unknown>; reason: string | undefined };

export function readDecisionOutcome(output: unknown): DecisionOutcome | undefined {
  if (!isPlainObject(output) || typeof output['action'] !== 'string') {
    return undefined;
  }
  const reason = output['reason'];
  return {
    edits: isPlainObject(output['edits']) ? output['edits'] : {},
    reason: hasText(reason) ? reason : undefined,
  };
}
