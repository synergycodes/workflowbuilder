import { serve } from '@hono/node-server';
import 'dotenv/config';
import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { cors } from 'hono/cors';

import {
  AllowAllAuthPort,
  AuthDeniedError,
  type AuthPort,
  type AuthVariables,
  createAuthMiddleware,
  makeAssertAuthorized,
} from './auth';
import { runMigrations } from './db/migrate';
import { env } from './env';
import { logger } from './logger';
import { createRateLimitMiddleware } from './middleware/rate-limit';
import { createExecutionsRoutes } from './routes/executions';
import { createVisualizeRoutes } from './routes/visualize';
import { createWorkflowsRoutes } from './routes/workflows';
import { NoopTenantContextPort, type TenantContextPort, type TenantVariables, createTenantMiddleware } from './tenant';

// Permissive default for local development. The constructor itself emits a
// loud startup warning and refuses to boot unless `WB_AUTH_PORT=allow-all` is
// set explicitly (opt-in, not opt-out). Replace this line with a real
// AuthPort before exposing this backend to anyone.
const authPort: AuthPort = new AllowAllAuthPort();

const assertAuthorized = makeAssertAuthorized(authPort);

// Default single-tenant: every request lands with `c.var.tenant === null`.
// Multi-tenant consumers swap in their own implementation (subdomain, JWT
// claim, header, …) — see `apps/backend/tenant-context-port.decision-log.md`.
const tenantPort: TenantContextPort = new NoopTenantContextPort();

const app = new Hono<{ Variables: AuthVariables & TenantVariables }>();

app.use('/*', cors());
// Reject request bodies larger than 1 MB to prevent memory exhaustion
app.use('/api/*', bodyLimit({ maxSize: 1024 * 1024 }));

// AuthDeniedError is the only deny path - the middleware throws, this maps
// to 401 (anonymous) or 403 (authenticated but forbidden). Anything else
// becomes a structured 500 so the error path is fully owned here instead of
// shared with Hono's plaintext default.
app.onError((error, c) => {
  if (error instanceof AuthDeniedError) {
    if (!error.caller) {
      return c.json({ code: 'unauthenticated', message: 'Authentication required' }, 401);
    }
    return c.json({ code: 'forbidden', message: error.message }, 403);
  }
  logger.error('unhandled request error', { error: error instanceof Error ? error.message : String(error) });
  return c.json({ code: 'internal_error', message: 'Internal server error' }, 500);
});

// Health check is intentionally registered before the auth and tenant
// middleware so it stays accessible to monitoring tools that don't carry
// credentials or tenant headers.
app.get('/api/health', (c) => c.json({ status: 'ok' }));

app.use('/api/*', createAuthMiddleware(authPort));
app.use('/api/*', createTenantMiddleware(tenantPort));

if (env.RATE_LIMIT_EXECUTE_PER_MINUTE > 0 || env.RATE_LIMIT_EXECUTE_PER_DAY > 0) {
  // Shared instance: workflow runs and Visualize "AI adapt" draw from one LLM-call budget.
  const executeRateLimit = createRateLimitMiddleware({
    perMinute: env.RATE_LIMIT_EXECUTE_PER_MINUTE,
    perDay: env.RATE_LIMIT_EXECUTE_PER_DAY,
    trustProxy: env.TRUST_PROXY,
  });
  app.use('/api/workflows/:id/execute', executeRateLimit);
  app.use('/api/visualize/adapt', executeRateLimit);
  logger.info('execute rate limit enabled', {
    perMinute: env.RATE_LIMIT_EXECUTE_PER_MINUTE,
    perDay: env.RATE_LIMIT_EXECUTE_PER_DAY,
    trustProxy: env.TRUST_PROXY,
  });
}

app.route('/api/workflows', createWorkflowsRoutes(assertAuthorized));
app.route('/api/executions', createExecutionsRoutes(assertAuthorized));
app.route('/api/visualize', createVisualizeRoutes(assertAuthorized));

// a failure (DB still starting) exits the process; the container restart policy retries
await runMigrations();
logger.info('database migrations applied');

serve({ fetch: app.fetch, port: env.PORT, hostname: env.HOST }, () => {
  logger.info('backend listening', { url: `http://${env.HOST}:${env.PORT}` });
});
