// Centralized env — fail fast at module load with a readable message.
function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required — see apps/execution-worker/.env.example`);
  }
  return value;
}

function envOr(name: string, defaultValue: string): string {
  return process.env[name] ?? defaultValue;
}

// Defaults use 127.0.0.1 (not `localhost`) to match the loopback-only docker
// bindings; see apps/backend/src/env.ts for the full reason.
export const env = {
  DATABASE_URL: envOr('DATABASE_URL', 'postgresql://wb:wb@127.0.0.1:5432/workflow_builder'),
  TEMPORAL_ADDRESS: envOr('TEMPORAL_ADDRESS', '127.0.0.1:7233'),
  OPENROUTER_API_KEY: requireEnv('OPENROUTER_API_KEY'),
  // Cheap, fast default for the public demo; quality-per-cost over frontier capability.
  AI_MODEL: envOr('AI_MODEL', 'mistralai/mistral-small-3.2-24b-instruct'),
  // Optional. Enables the AI Agent's web-search tool; agents run without it when unset.
  TAVILY_API_KEY: process.env['TAVILY_API_KEY'],
  // Optional. GitHub token for the Copilot CLI agent-harness provider; unset disables it.
  COPILOT_GITHUB_TOKEN: process.env['COPILOT_GITHUB_TOKEN'],
  // Optional. Overrides the resolved `copilot` CLI binary path.
  COPILOT_CLI_PATH: process.env['COPILOT_CLI_PATH'],
  // Polled only by the specialized worker (see engines/temporal/specialized-worker.ts).
  // A distinct queue name, not the plugin's own, so routing a node here is opt-in per type.
  SPECIALIZED_TASK_QUEUE: envOr('SPECIALIZED_TASK_QUEUE', 'workflow-execution-specialized'),
};
