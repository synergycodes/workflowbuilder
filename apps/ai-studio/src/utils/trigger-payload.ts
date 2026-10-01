import { isPlainObject } from './is-plain-object';

/**
 * The run's trigger payload from the trigger's Input. A JSON object also lends its fields to `{{trigger.<field>}}`;
 * `input` always carries the raw text, because an AI Agent reads the trigger through it.
 */
export function triggerPayloadOf(inputPrompt: string): Record<string, unknown> {
  if (!inputPrompt) return {};

  let parsed: unknown;
  try {
    parsed = JSON.parse(inputPrompt);
  } catch {
    return { input: inputPrompt };
  }
  return isPlainObject(parsed) ? { ...parsed, input: inputPrompt } : { input: inputPrompt };
}
