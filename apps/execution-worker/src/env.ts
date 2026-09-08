function envOr(name: string, defaultValue: string): string {
  return process.env[name] ?? defaultValue;
}

// Empty string counts as unset: compose passes absent optionals through as
// `${VAR:-}`, and a bare `?? null` would read '' as a configured value.
function envOptional(name: string): string | null {
  return process.env[name] || null;
}

// Defaults use 127.0.0.1 (not `localhost`) to match the loopback-only docker
// bindings; see apps/backend/src/env.ts for the full reason.
export const env = {
  DATABASE_URL: envOr('DATABASE_URL', 'postgresql://wb:wb@127.0.0.1:5432/workflow_builder'),
  // TEMPORAL_*: read at startup by @workflow-builder/temporal-connection
  // AI Agent nodes need all three. Any missing one: the worker still boots and runs
  // every non-AI node; AI Agent nodes fail with `ai_not_configured` when reached.
  // No built-in endpoint or model — nothing in the code points outside the network.
  AI_API_KEY: envOptional('AI_API_KEY'),
  // Any OpenAI-compatible endpoint, including one inside your own network.
  AI_BASE_URL: envOptional('AI_BASE_URL'),
  AI_MODEL: envOptional('AI_MODEL'),
  // Optional. Enables the AI Agent's web-search tool; agents run without it when unset.
  TAVILY_API_KEY: process.env['TAVILY_API_KEY'],
};
