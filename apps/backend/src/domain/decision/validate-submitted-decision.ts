import { z } from 'zod';

import type {
  Decision,
  DecisionAction,
  DecisionEffect,
  DecisionRequest,
} from '@workflow-builder/types/workflow-execution/decision-request';

import { type SubmittedDecisionErrorCode, submittedDecisionErrorMessage } from './decision-issues';

// Parsed at the endpoint, which extends it with `nodeId` and `attempt`, before
// `validateSubmittedDecision` checks the rules on the parsed shape.
export const submittedDecisionSchema = z.object({
  action: z.string(),
  edits: z.record(z.string(), z.unknown()).optional(),
  reason: z.string().optional(),
  comment: z.string().optional(),
});

export type SubmittedDecision = z.infer<typeof submittedDecisionSchema>;

export type SubmittedDecisionError = { code: SubmittedDecisionErrorCode; message: string; path?: string[] };

// `action` is the matched action, for routing; the decision itself records only its name.
export type SubmittedDecisionResult =
  | { decision: Decision; action: DecisionAction; error?: undefined }
  | { decision?: undefined; action?: undefined; error: SubmittedDecisionError };

function refuse(code: SubmittedDecisionErrorCode, value: string, path: string[]): SubmittedDecisionResult {
  return { error: { code, message: submittedDecisionErrorMessage(code, value), path } };
}

function isBlank(text: string | undefined): boolean {
  return text === undefined || text.trim().length === 0;
}

// "Emptied" means the decider cleared the field, not that they typed something invalid.
function isEmptied(value: unknown): boolean {
  return value === undefined || value === null || (typeof value === 'string' && value.trim().length === 0);
}

// The request arrived through the parser, so `schema` has the shape checked there; the
// reads below only narrow what `Record<string, unknown>` hides.
function asObject(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

type EditedChild = { key: string; value: unknown; declared: Record<string, unknown> | undefined };

// What an edited value's children are and which schema declares each. Undefined for a leaf,
// which has none. An array's elements are all declared by `items`, so an index carries no
// rules of its own; a level the form does not describe inline declares nothing at all.
function childrenOf(
  schema: Record<string, unknown>,
  edited: unknown,
): { children: EditedChild[]; required: Set<string> } | undefined {
  const fields = asObject(edited);
  if (fields !== undefined) {
    const properties = asObject(schema['properties']) ?? {};
    const names = schema['required'];
    return {
      children: Object.entries(fields).map(([key, value]) => ({
        key,
        value,
        declared: Object.hasOwn(properties, key) ? (asObject(properties[key]) ?? {}) : undefined,
      })),
      required: new Set(Array.isArray(names) ? (names as string[]) : []),
    };
  }

  if (!Array.isArray(edited)) return undefined;
  const items = asObject(schema['items']);
  return {
    children: edited.map((value, index) => ({ key: `${index}`, value, declared: items })),
    required: new Set<string>(),
  };
}

// Every level the form declares, not just the outermost one: a `readOnly` child would
// otherwise be rewritten by replacing the object that holds it
// (follow-up: decision-edit-schema-composition).
function validateEdits(
  schema: Record<string, unknown>,
  edited: unknown,
  path: string[],
): SubmittedDecisionResult | undefined {
  const level = childrenOf(schema, edited);
  if (level === undefined) return undefined;

  for (const { key, value, declared } of level.children) {
    const here = [...path, key];
    if (declared === undefined) return refuse('unknown_field', key, here);
    if (declared['readOnly'] === true) return refuse('field_not_editable', key, here);
    if (level.required.has(key) && isEmptied(value)) return refuse('required_field_missing', key, here);

    const refused = validateEdits(declared, value, here);
    if (refused !== undefined) return refused;
  }

  return undefined;
}

// Presence and editability only. Whether an edited value fits its declared type is a
// later concern with its own validator (follow-up: decision-edit-value-validation)
export function validateSubmittedDecision(
  request: DecisionRequest,
  submitted: SubmittedDecision,
): SubmittedDecisionResult {
  const action = request.actions.find((candidate) => candidate.name === submitted.action);
  if (action === undefined) return refuse('unknown_action', submitted.action, ['action']);

  if (action.effect === 'reject' && action.reasonRequired && isBlank(submitted.reason)) {
    return refuse('reason_required', action.name, ['reason']);
  }
  if (action.effect === 'rerun-source' && isBlank(submitted.comment)) {
    return refuse('comment_required', action.name, ['comment']);
  }

  // Before the walk, so the refusal names the edits and not one field.
  const edits = submitted.edits ?? {};
  if (action.effect !== 'resume' && Object.keys(edits).length > 0) {
    return refuse('edits_not_allowed', action.name, ['edits']);
  }

  const refused = validateEdits(request.schema, edits, ['edits']);
  if (refused !== undefined) return refused;

  const withEdits = Object.keys(edits).length > 0;
  const effect: DecisionEffect = action.effect === 'resume' && withEdits ? 'resume-with-edits' : action.effect;
  return {
    decision: { action: action.name, effect, edits, reason: submitted.reason, comment: submitted.comment },
    action,
  };
}
