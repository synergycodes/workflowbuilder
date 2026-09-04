function envOr(name: string, defaultValue: string): string {
  return process.env[name] ?? defaultValue;
}

// Empty string counts as unset: compose passes absent optionals through as
// `${VAR:-}`, and a bare `?? null` would read '' as a configured value.
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
  // AI adapt needs all three; any missing one disables the endpoint (returns 501).
  // No built-in endpoint or model — nothing in the code points outside the network.
  // The worker keeps its own copies.
  AI_API_KEY: envOptional('AI_API_KEY'),
  // Any OpenAI-compatible endpoint, including one inside your own network.
  AI_BASE_URL: envOptional('AI_BASE_URL'),
  AI_MODEL: envOptional('AI_MODEL'),
};
