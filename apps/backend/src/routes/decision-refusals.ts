import type { Context } from 'hono';

import type { ResolveNodeRejection } from '@workflow-builder/execution-core/workflow';

import { fill } from '../domain/decision/decision-issues';
import type { FindDecisionRequestError } from '../domain/decision/find-decision-request';

// Every code the decision endpoint refuses with, and its status. The one place a code is spelled out.
export const DECISION_REFUSAL_STATUS = {
  validation_error: 400,
  invalid_decision: 400,
  execution_not_found: 404,
  node_not_found: 404,
  execution_not_waiting: 409,
  node_not_waiting: 409,
  decision_already_made: 409,
  decision_attempt_mismatch: 409,
  effect_not_supported: 501,
  decision_delivery_timeout: 503,
} as const;

export type DecisionRefusalCode = keyof typeof DECISION_REFUSAL_STATUS;

// One entry per situation; several situations may answer with the same code.
// `{value}` is the one interpolation slot.
export const DECISION_REFUSALS = {
  body_invalid: { code: 'validation_error', message: 'Request body failed validation' },
  decision_invalid: { code: 'invalid_decision', message: 'Decision failed validation' },
  execution_not_found: { code: 'execution_not_found', message: 'Execution not found' },
  execution_not_waiting: { code: 'execution_not_waiting', message: 'Execution is not waiting for a decision' },
  run_gone: { code: 'execution_not_waiting', message: 'Execution is no longer running' },
  node_not_found: { code: 'node_not_found', message: "No node '{value}' in this execution" },
  node_without_request: { code: 'node_not_waiting', message: "Node '{value}' carries no decision request" },
  node_never_parked: { code: 'node_not_waiting', message: "Node '{value}' has not asked for a decision" },
  node_not_waiting: { code: 'node_not_waiting', message: "Node '{value}' is not waiting for a decision" },
  decision_already_made: {
    code: 'decision_already_made',
    message: "Node '{value}' already has a decision for this wait",
  },
  attempt_mismatch: {
    code: 'decision_attempt_mismatch',
    message: 'The decision names a wait that is not the current one',
  },
  effect_not_supported: {
    code: 'effect_not_supported',
    message: "Action '{value}' re-runs the proposal source, which is not supported yet",
  },
  // Not durable until accepted, yet the server may still hand it to the next worker.
  delivery_timeout: {
    code: 'decision_delivery_timeout',
    message:
      'The decision was not confirmed within the deadline and may or may not have landed. Send it again: a decision_already_made answer means it did.',
    headers: { 'Retry-After': '5' },
  },
} as const satisfies Record<string, { code: DecisionRefusalCode; message: string; headers?: Record<string, string> }>;

export type DecisionRefusal = keyof typeof DECISION_REFUSALS;

export const LOOKUP_REFUSALS = {
  node_not_found: 'node_not_found',
  node_without_decision_request: 'node_without_request',
} as const satisfies Record<FindDecisionRequestError, DecisionRefusal>;

// The route built the envelope, so a fault can only be its own bug: it surfaces as 500.
export const ENGINE_REFUSALS = {
  node_not_waiting: 'node_not_waiting',
  verdict_already_delivered: 'decision_already_made',
  run_not_found: 'run_gone',
  verdict_for_unknown_node: 'fault',
  verdict_malformed: 'fault',
  delivery_timeout: 'delivery_timeout',
} as const satisfies Record<ResolveNodeRejection, DecisionRefusal | 'fault'>;

export function refuse(c: Context, refusal: DecisionRefusal, value?: string, extra: Record<string, unknown> = {}) {
  const entry = DECISION_REFUSALS[refusal];
  const headers = 'headers' in entry ? entry.headers : undefined;
  return c.json(
    { code: entry.code, message: fill(entry.message, value), ...extra },
    DECISION_REFUSAL_STATUS[entry.code],
    headers,
  );
}
