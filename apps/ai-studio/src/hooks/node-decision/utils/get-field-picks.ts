import { isPlainObject } from '../../../utils/is-plain-object';
import type { DecisionFieldPick } from '../types';

function isPick(entry: unknown): entry is DecisionFieldPick {
  return (
    isPlainObject(entry) &&
    typeof entry['label'] === 'string' &&
    typeof entry['reference'] === 'string' &&
    typeof entry['type'] === 'string'
  );
}

/** The picks a node's `editableFields` property holds; authored data, so only the well-formed entries count. */
export function getFieldPicks(value: unknown): DecisionFieldPick[] {
  return Array.isArray(value) ? value.filter(isPick) : [];
}
