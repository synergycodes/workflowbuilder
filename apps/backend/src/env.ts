function envOr(name: string, defaultValue: string): string {
  return process.env[name] ?? defaultValue;
}

// Unset is null (any origin); set is the list, so an empty value means no cross-origin caller.
// Each entry is reduced to its origin, since the browser sends it bare and lower-case.
function originList(name: string): string[] | null {
  const value = process.env[name];
  if (value === undefined) {
    return null;
  }
  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry !== '')
    .map((entry) => {
      try {
        return new URL(entry).origin;
      } catch {
        throw new Error(`${name}: "${entry}" is not a URL`);
      }
    });
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
  // TEMPORAL_*: read at connect time by @workflow-builder/temporal-connection.
  // AI_API_KEY / AI_BASE_URL / AI_MODEL: read per request by @workflow-builder/ai-config.
  // 0 disables (dev default); the deploy compose sets both
  RATE_LIMIT_EXECUTE_PER_MINUTE: Number(envOr('RATE_LIMIT_EXECUTE_PER_MINUTE', '0')),
  RATE_LIMIT_EXECUTE_PER_DAY: Number(envOr('RATE_LIMIT_EXECUTE_PER_DAY', '0')),
  TRUST_PROXY: envOr('TRUST_PROXY', 'false') === 'true',
  // Null = every origin may call (dev default: the frontend runs on another port).
  ALLOWED_ORIGINS: originList('ALLOWED_ORIGINS'),
  // Read only under the AllowAllAuthPort (server.ts): unset keeps the collection routes off there, so a
  // forgotten variable never exposes every id. A real port authorizes listing by itself.
  ENABLE_WB_LISTING: envOr('ENABLE_WB_LISTING', 'false') === 'true',
  // Null = Turnstile verification disabled (local dev runs unprotected).
  TURNSTILE_SECRET_KEY: process.env['TURNSTILE_SECRET_KEY'] ?? null,
};
