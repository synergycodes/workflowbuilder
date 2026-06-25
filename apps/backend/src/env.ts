function envOr(name: string, defaultValue: string): string {
  return process.env[name] ?? defaultValue;
}

// 127.0.0.1 (not `localhost`) matches the loopback-only docker bindings in
// apps/backend/docker-compose.yml — see local-dev-binding.decision-log.md
// for that decision. On some Windows / Node configs `localhost` resolves to
// ::1 (IPv6) first, which the IPv4-only docker mapping rejects, so the env
// defaults must spell the explicit IPv4 form to stay aligned with the bind.
export const env = {
  PORT: Number(envOr('PORT', '3001')),
  HOST: envOr('HOST', '127.0.0.1'),
  DATABASE_URL: envOr('DATABASE_URL', 'postgresql://wb:wb@127.0.0.1:5432/workflow_builder'),
  TEMPORAL_ADDRESS: envOr('TEMPORAL_ADDRESS', '127.0.0.1:7233'),
  // 0 disables (dev default); the deploy compose sets both
  RATE_LIMIT_EXECUTE_PER_MINUTE: Number(envOr('RATE_LIMIT_EXECUTE_PER_MINUTE', '0')),
  RATE_LIMIT_EXECUTE_PER_DAY: Number(envOr('RATE_LIMIT_EXECUTE_PER_DAY', '0')),
  TRUST_PROXY: envOr('TRUST_PROXY', 'false') === 'true',
  // Cloudflare Turnstile secret. Null = verification disabled (local dev runs
  // unprotected). When set, workflow execution requires a valid Turnstile token.
  TURNSTILE_SECRET_KEY: process.env['TURNSTILE_SECRET_KEY'] ?? null,
  // Per-IP execution rate limit: at most LIMIT runs per WINDOW_MS. Applies even
  // without Turnstile, so the public demo budget has a backstop out of the box.
  EXECUTE_RATE_LIMIT: Number(envOr('EXECUTE_RATE_LIMIT', '10')),
  EXECUTE_RATE_WINDOW_MS: Number(envOr('EXECUTE_RATE_WINDOW_MS', '60000')),
  // OpenRouter for the Visualize "AI adapt" endpoint. Null = adapt disabled
  // (the endpoint returns 501). The worker keeps its own key for execution.
  OPENROUTER_API_KEY: process.env['OPENROUTER_API_KEY'] ?? null,
  AI_MODEL: envOr('AI_MODEL', 'google/gemini-2.5-flash-lite'),
};
