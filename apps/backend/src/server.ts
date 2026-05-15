import { serve } from '@hono/node-server';
import 'dotenv/config';
import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { cors } from 'hono/cors';

import { AllowAllAuthPort, type AuthPort, type AuthVariables, createAuthMiddleware, makeAuthorize } from './auth';
import { env } from './env';
import { logger } from './logger';
import { createExecutionsRoutes } from './routes/executions';
import { createWorkflowsRoutes } from './routes/workflows';

// Permissive default for local development. The constructor itself emits a
// loud startup warning and refuses to boot under NODE_ENV=production without
// an explicit `WB_ALLOW_INSECURE=1` opt-in. Replace this line with a real
// AuthPort before exposing this backend to anyone.
const authPort: AuthPort = new AllowAllAuthPort();

const authorize = makeAuthorize(authPort);

const app = new Hono<{ Variables: AuthVariables }>();

app.use('/*', cors());
// Reject request bodies larger than 1 MB to prevent memory exhaustion
app.use('/api/*', bodyLimit({ maxSize: 1024 * 1024 }));

// Health check is intentionally registered before the auth middleware so it
// stays accessible to monitoring tools that don't carry credentials.
app.get('/api/health', (c) => c.json({ status: 'ok' }));

app.use('/api/*', createAuthMiddleware(authPort));

app.route('/api/workflows', createWorkflowsRoutes(authorize));
app.route('/api/executions', createExecutionsRoutes(authorize));

serve({ fetch: app.fetch, port: env.PORT, hostname: env.HOST }, () => {
  logger.info('backend listening', { url: `http://${env.HOST}:${env.PORT}` });
});
