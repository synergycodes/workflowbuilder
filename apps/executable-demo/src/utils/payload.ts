export type PayloadParseResult = { ok: true; value: Record<string, unknown> } | { ok: false; error: string };

export function parseTriggerPayload(source: string): PayloadParseResult {
  const trimmed = source.trim();
  if (!trimmed) return { ok: true, value: {} };

  let value: unknown;
  try {
    value = JSON.parse(trimmed);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid JSON';
    return { ok: false, error: `Enter valid JSON: ${message}` };
  }

  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return { ok: false, error: 'The run payload must be a JSON object.' };
  }

  return { ok: true, value: value as Record<string, unknown> };
}
