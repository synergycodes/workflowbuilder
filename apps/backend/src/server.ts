import { serve } from '@hono/node-server';
import 'dotenv/config';
import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { cors } from 'hono/cors';

import { env } from './env';
import { logger } from './logger';
import { executionsRoutes } from './routes/executions';
import { workflowsRoutes } from './routes/workflows';

const app = new Hono();

app.use('/*', cors());
// Reject request bodies larger than 1 MB to prevent memory exhaustion
app.use('/api/*', bodyLimit({ maxSize: 1024 * 1024 }));

app.get('/api/health', (c) => c.json({ status: 'ok' }));

app.route('/api/workflows', workflowsRoutes);
app.route('/api/executions', executionsRoutes);

serve({ fetch: app.fetch, port: env.PORT, hostname: env.HOST }, () => {
  logger.info('backend listening', { url: `http://${env.HOST}:${env.PORT}` });
});
