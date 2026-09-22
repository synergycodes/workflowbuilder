import { BACKEND_URL } from '../config';

export type DecisionBody = {
  nodeId: string;
  attempt: number;
  action: string;
  edits?: Record<string, unknown>;
  reason?: string;
};

export type SubmitDecisionResult =
  | { ok: true; effect: string }
  | {
      ok: false;
      status: number;
      code: string;
      message: string;
      /** From a 503 `Retry-After` header. */
      retryAfterSeconds?: number;
      /** From a `decision_attempt_mismatch` envelope: the wait the server currently holds. */
      currentAttempt?: number;
      /** The first entry of a 400 envelope's `details`. */
      detail?: string;
    };

// Drops an empty `edits` and a blank `reason`, so the body carries only what the route reads.
function decisionBody(input: DecisionBody): DecisionBody {
  const { nodeId, attempt, action, edits, reason } = input;
  return {
    nodeId,
    attempt,
    action,
    ...(edits !== undefined && Object.keys(edits).length > 0 ? { edits } : {}),
    ...(reason !== undefined && reason.trim().length > 0 ? { reason } : {}),
  };
}

async function readJson(response: Response): Promise<Record<string, unknown>> {
  try {
    const parsed: unknown = await response.json();
    return typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

function stringOf(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function firstDetailMessage(details: unknown): string | undefined {
  if (!Array.isArray(details) || details.length === 0) {
    return undefined;
  }
  const first = details[0] as { message?: unknown } | undefined;
  return stringOf(first?.message);
}

export async function submitDecision(executionId: string, body: DecisionBody): Promise<SubmitDecisionResult> {
  let response: Response;
  try {
    response = await fetch(`${BACKEND_URL}/api/executions/${executionId}/decision`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(decisionBody(body)),
    });
  } catch (error) {
    return {
      ok: false,
      status: 0,
      code: 'network_error',
      message: error instanceof Error ? error.message : 'The decision could not be sent',
    };
  }

  const payload = await readJson(response);
  if (response.ok) {
    return { ok: true, effect: stringOf(payload['effect']) ?? 'unknown' };
  }

  const retryAfter = Number(response.headers.get('Retry-After'));
  const currentAttempt = payload['attempt'];
  const detail = firstDetailMessage(payload['details']);
  return {
    ok: false,
    status: response.status,
    code: stringOf(payload['code']) ?? `http_${response.status}`,
    message: stringOf(payload['message']) ?? response.statusText,
    ...(Number.isFinite(retryAfter) && retryAfter > 0 ? { retryAfterSeconds: retryAfter } : {}),
    ...(typeof currentAttempt === 'number' ? { currentAttempt } : {}),
    ...(detail === undefined ? {} : { detail }),
  };
}
