import { isPlainObject } from './is-plain-object';

/**
 * The run's trigger payload from the trigger's Input: a JSON object's fields, read as `{{trigger.<field>}}`,
 * or any other text under `input`. Parsed fields replace the text, as an AI Agent's `outputSchema` answer replaces `response`.
 */
export function triggerPayloadOf(inputPrompt: string): Record<string, unknown> {
  if (!inputPrompt) return {};

  let parsed: unknown;
  try {
    parsed = JSON.parse(inputPrompt);
  } catch {
    return { input: inputPrompt };
  }
  return isPlainObject(parsed) ? parsed : { input: inputPrompt };
}
