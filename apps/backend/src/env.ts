function envOr(name: string, defaultValue: string): string {
  return process.env[name] ?? defaultValue;
}

// Empty string counts as unset. Compose passes absent optionals through as
// `${VAR:-}`, so a bare `?? null` would read '' as a configured value and, for
// the key below, shadow the fallback.
function envOptional(name: string): string | null {
  return process.env[name] || null;
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
  // Must match the worker's. Temporal Cloud spells it `<namespace>.<accountId>`.
  TEMPORAL_NAMESPACE: envOr('TEMPORAL_NAMESPACE', 'default'),
  // Unset means "infer": any of the credentials below turns TLS on. Set it to
  // 'true' to require TLS on its own, or 'false' to assert plaintext.
  TEMPORAL_TLS: envOptional('TEMPORAL_TLS'),
  TEMPORAL_API_KEY: envOptional('TEMPORAL_API_KEY'),
  // Paths, read at connect time. CA for a private issuer; the cert/key pair for mTLS.
  TEMPORAL_TLS_CA_PATH: envOptional('TEMPORAL_TLS_CA_PATH'),
  TEMPORAL_TLS_CERT_PATH: envOptional('TEMPORAL_TLS_CERT_PATH'),
  TEMPORAL_TLS_KEY_PATH: envOptional('TEMPORAL_TLS_KEY_PATH'),
  // 0 disables (dev default); the deploy compose sets both
  RATE_LIMIT_EXECUTE_PER_MINUTE: Number(envOr('RATE_LIMIT_EXECUTE_PER_MINUTE', '0')),
  RATE_LIMIT_EXECUTE_PER_DAY: Number(envOr('RATE_LIMIT_EXECUTE_PER_DAY', '0')),
  TRUST_PROXY: envOr('TRUST_PROXY', 'false') === 'true',
  // Null = Turnstile verification disabled (local dev runs unprotected).
  TURNSTILE_SECRET_KEY: process.env['TURNSTILE_SECRET_KEY'] ?? null,
  // Any OpenAI-compatible endpoint, including one inside your own network.
  AI_BASE_URL: envOr('AI_BASE_URL', 'https://openrouter.ai/api/v1'),
  // Null = the "AI adapt" endpoint is disabled (returns 501). The worker keeps its own key.
  // OPENROUTER_API_KEY is the former name, still honoured so existing deployments keep working.
  AI_API_KEY: envOptional('AI_API_KEY') ?? envOptional('OPENROUTER_API_KEY'),
  AI_MODEL: envOr('AI_MODEL', 'mistralai/mistral-small-3.2-24b-instruct'),
};
