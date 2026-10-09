import { hasText } from '../has-text';
import { isPlainObject } from '../is-plain-object';

/** What the person decided, read back from the node's completion. */
type DecisionOutcome = { edits: Record<string, unknown>; reason: string | undefined; comment: string | undefined };

export function readDecisionOutcome(output: unknown): DecisionOutcome | undefined {
  if (!isPlainObject(output) || typeof output['action'] !== 'string') {
    return undefined;
  }
  const { reason, comment } = output;
  return {
    edits: isPlainObject(output['edits']) ? output['edits'] : {},
    reason: hasText(reason) ? reason : undefined,
    comment: hasText(comment) ? comment : undefined,
  };
}
