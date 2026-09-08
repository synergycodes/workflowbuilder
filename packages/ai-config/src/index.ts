const AI_VARIABLES = ['AI_API_KEY', 'AI_BASE_URL', 'AI_MODEL'] as const;

export type AiVariable = (typeof AI_VARIABLES)[number];

export type AiConfig = { apiKey: string; baseURL: string; modelId: string };

// Either everything an OpenAI-compatible client needs, or which variables are missing.
// What to do about `available: false` is each app's call: the backend answers 501, the
// worker boots and fails an AI Agent node only when a run reaches one.
export type AiConfigResult = { available: true; config: AiConfig } | { available: false; missing: AiVariable[] };

export function aiConfig(env: NodeJS.ProcessEnv = process.env): AiConfigResult {
  // Empty string counts as unset: compose passes absent optionals through as
  // `${VAR:-}`, and a bare `?? null` would read '' as a configured value.
  const value = (name: AiVariable) => env[name] || null;
  const apiKey = value('AI_API_KEY');
  const baseURL = value('AI_BASE_URL');
  const modelId = value('AI_MODEL');

  // No built-in endpoint or model: nothing in the code points outside the network.
  return apiKey && baseURL && modelId
    ? { available: true, config: { apiKey, baseURL, modelId } }
    : { available: false, missing: AI_VARIABLES.filter((name) => !value(name)) };
}
