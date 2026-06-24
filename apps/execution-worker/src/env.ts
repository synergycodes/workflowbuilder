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
  // Cheap, fast default for the public demo. Quality-per-cost is what matters
  // here, not frontier capability — the canvas is the product, not the model.
  AI_MODEL: envOr('AI_MODEL', 'google/gemini-2.5-flash-lite'),
};
