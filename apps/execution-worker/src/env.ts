function envOr(name: string, defaultValue: string): string {
  return process.env[name] ?? defaultValue;
}

// Empty string counts as unset. Compose passes absent optionals through as
// `${VAR:-}`, so a bare `?? null` would read '' as a configured value and, for
// the key below, shadow the fallback.
function envOptional(name: string): string | null {
  return process.env[name] || null;
}

// Defaults use 127.0.0.1 (not `localhost`) to match the loopback-only docker
// bindings; see apps/backend/src/env.ts for the full reason.
export const env = {
  DATABASE_URL: envOr('DATABASE_URL', 'postgresql://wb:wb@127.0.0.1:5432/workflow_builder'),
  TEMPORAL_ADDRESS: envOr('TEMPORAL_ADDRESS', '127.0.0.1:7233'),
  // Any OpenAI-compatible endpoint, including one inside your own network.
  AI_BASE_URL: envOr('AI_BASE_URL', 'https://openrouter.ai/api/v1'),
  // Null = the worker still boots and runs every non-AI node; AI Agent nodes
  // fail with `ai_not_configured` when reached. OPENROUTER_API_KEY is the
  // former name, still honoured so existing deployments keep working.
  AI_API_KEY: envOptional('AI_API_KEY') ?? envOptional('OPENROUTER_API_KEY'),
  // Cheap, fast default for the public demo; quality-per-cost over frontier capability.
  AI_MODEL: envOr('AI_MODEL', 'mistralai/mistral-small-3.2-24b-instruct'),
  // Optional. Enables the AI Agent's web-search tool; agents run without it when unset.
  TAVILY_API_KEY: process.env['TAVILY_API_KEY'],
};
