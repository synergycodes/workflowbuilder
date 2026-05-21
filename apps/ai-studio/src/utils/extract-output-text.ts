// AI agents return { response }, trigger returns { input } — others fall back to JSON
export function extractOutputText(output: unknown): string {
  if (output === undefined || output === null) return '';
  if (typeof output === 'string') return output;
  if (typeof output === 'object') {
    const object = output as Record<string, unknown>;
    if (typeof object['response'] === 'string') return object['response'];
    if (typeof object['input'] === 'string') return object['input'];
  }
  return JSON.stringify(output, null, 2);
}
