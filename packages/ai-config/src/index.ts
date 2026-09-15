const AI_VARIABLES = ['AI_API_KEY', 'AI_BASE_URL', 'AI_MODEL'] as const;

// Names this contract dropped. Still set somewhere, they are dead weight the
// operator cannot see: the app reads none of them.
const RETIRED_AI_VARIABLES = ['OPENROUTER_API_KEY'] as const;

export type AiVariable = (typeof AI_VARIABLES)[number];

export type RetiredAiVariable = (typeof RETIRED_AI_VARIABLES)[number];

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

  // No built-in endpoint or model: unset means there is no model endpoint to call.
  return apiKey && baseURL && modelId
    ? { available: true, config: { apiKey, baseURL, modelId } }
    : { available: false, missing: AI_VARIABLES.filter((name) => !value(name)) };
}

// Which retired names an environment still carries, so an app can say why a key that
// used to work is ignored. The value is never read, only whether one is present.
export function retiredAiVariables(env: NodeJS.ProcessEnv = process.env): RetiredAiVariable[] {
  return RETIRED_AI_VARIABLES.filter((name) => Boolean(env[name]));
}
