import type {
  DecisionAction,
  DecisionContract,
  DecisionEffect,
} from '@workflow-builder/types/workflow-execution/decision-contract';

import { type SubmittedDecisionErrorCode, submittedDecisionErrorMessage } from './decision-issues';

// What the decider sent, before anything has checked it. Provisional: the decision
// endpoint owns the public request shape and may rename these.
export type SubmittedDecision = {
  action: string;
  edits?: Record<string, unknown>;
  reason?: string;
  comment?: string;
};

// A submission the contract accepts. The matched action carries the port to route on;
// `effect` is `resume-with-edits` when a resume came with edits.
export type Decision = {
  action: DecisionAction;
  effect: DecisionEffect;
  edits: Record<string, unknown>;
  reason?: string;
  comment?: string;
};

export type SubmittedDecisionError = { code: SubmittedDecisionErrorCode; message: string; path?: string[] };

export type SubmittedDecisionResult =
  | { decision: Decision; error?: undefined }
  | { decision?: undefined; error: SubmittedDecisionError };

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

// The contract arrived through the parser, so `schema` has the shape checked there;
// the reads below only narrow what `Record<string, unknown>` hides.
function formProperties(contract: DecisionContract): Record<string, { readOnly?: unknown }> {
  return (contract.schema['properties'] ?? {}) as Record<string, { readOnly?: unknown }>;
}

function requiredFields(contract: DecisionContract): string[] {
  return (contract.schema['required'] ?? []) as string[];
}

// Presence and editability only. Whether an edited value fits its declared type is a
// later concern with its own validator.
export function validateSubmittedDecision(
  contract: DecisionContract,
  submitted: SubmittedDecision,
): SubmittedDecisionResult {
  const action = contract.actions.find((candidate) => candidate.name === submitted.action);
  if (action === undefined) return refuse('unknown_action', submitted.action, ['action']);

  if (action.effect === 'reject' && action.reasonRequired && isBlank(submitted.reason)) {
    return refuse('reason_required', action.name, ['reason']);
  }
  if (action.effect === 'rerun-source' && isBlank(submitted.comment)) {
    return refuse('comment_required', action.name, ['comment']);
  }

  const properties = formProperties(contract);
  const required = new Set(requiredFields(contract));
  const edits = submitted.edits ?? {};
  for (const [field, value] of Object.entries(edits)) {
    if (!Object.hasOwn(properties, field)) return refuse('unknown_field', field, ['edits', field]);
    if (properties[field].readOnly === true) return refuse('field_not_editable', field, ['edits', field]);
    if (required.has(field) && isEmptied(value)) return refuse('required_field_missing', field, ['edits', field]);
  }

  const withEdits = Object.keys(edits).length > 0;
  const effect: DecisionEffect = action.effect === 'resume' && withEdits ? 'resume-with-edits' : action.effect;
  return { decision: { action, effect, edits, reason: submitted.reason, comment: submitted.comment } };
}
