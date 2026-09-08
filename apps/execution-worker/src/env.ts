function envOr(name: string, defaultValue: string): string {
  return process.env[name] ?? defaultValue;
}

// Defaults use 127.0.0.1 (not `localhost`) to match the loopback-only docker
// bindings; see apps/backend/src/env.ts for the full reason.
export const env = {
  DATABASE_URL: envOr('DATABASE_URL', 'postgresql://wb:wb@127.0.0.1:5432/workflow_builder'),
  // TEMPORAL_*: read at startup by @workflow-builder/temporal-connection.
  // AI_API_KEY / AI_BASE_URL / AI_MODEL: read at startup by @workflow-builder/ai-config.
  // Optional. Enables the AI Agent's web-search tool; agents run without it when unset.
  // Empty counts as unset: compose passes it through as `${TAVILY_API_KEY:-}`.
  TAVILY_API_KEY: process.env['TAVILY_API_KEY'] || undefined,
};
