import { z } from 'zod';

import type {
  Decision,
  DecisionAction,
  DecisionEffect,
  DecisionRequest,
} from '@workflow-builder/types/workflow-execution/decision-request';

import { type SubmittedDecisionErrorCode, submittedDecisionErrorMessage } from './decision-issues';

// The shape of what the decider sent. The caller parses a body with this before calling
// `validateSubmittedDecision`, which assumes the shape and checks only the rules.
// Provisional: the decision endpoint owns the public request shape and may rename fields.
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

// The request arrived through the parser, so `schema` has the shape checked there;
// the reads below only narrow what `Record<string, unknown>` hides.
function formProperties(request: DecisionRequest): Record<string, { readOnly?: unknown }> {
  return (request.schema['properties'] ?? {}) as Record<string, { readOnly?: unknown }>;
}

function requiredFields(request: DecisionRequest): string[] {
  return (request.schema['required'] ?? []) as string[];
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

  const properties = formProperties(request);
  const required = new Set(requiredFields(request));
  const edits = submitted.edits ?? {};
  for (const [field, value] of Object.entries(edits)) {
    if (!Object.hasOwn(properties, field)) return refuse('unknown_field', field, ['edits', field]);
    if (properties[field].readOnly === true) return refuse('field_not_editable', field, ['edits', field]);
    if (required.has(field) && isEmptied(value)) return refuse('required_field_missing', field, ['edits', field]);
  }

  const withEdits = Object.keys(edits).length > 0;
  const effect: DecisionEffect = action.effect === 'resume' && withEdits ? 'resume-with-edits' : action.effect;
  return {
    decision: { action: action.name, effect, edits, reason: submitted.reason, comment: submitted.comment },
    action,
  };
}
