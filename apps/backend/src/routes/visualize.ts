import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { generateText } from 'ai';
import { Hono } from 'hono';
import { z } from 'zod';

import type { AssertAuthorized, AuthVariables } from '../auth';
import { env } from '../env';
import { logger as backendLogger } from '../logger';
import { guardExecution } from '../security/execution-guard';
import type { TenantVariables } from '../tenant';

const logger = backendLogger.child({ component: 'visualize-route' });

const adaptSchema = z.object({
  content: z.string().min(1).max(20_000),
  format: z.enum(['diagram', 'chart', 'table', 'json', 'stat-cards', 'markdown', 'text']),
});

// One conversion instruction per target format. Each asks for ONLY the payload
// (no code fences, no prose) so the renderer gets clean input.
const FORMAT_PROMPTS: Record<z.infer<typeof adaptSchema>['format'], string> = {
  diagram:
    'Turn the content into a single valid Mermaid diagram (use a flowchart unless another diagram type clearly fits better). Output ONLY the Mermaid source — no code fences, no explanation.',
  chart:
    'Turn the content into chart data: a JSON array of {"label": string, "value": number} objects, or {"type": "bar"|"line"|"pie", "data": [...]}. Output ONLY JSON — no code fences, no explanation.',
  table:
    'Turn the content into a JSON array of flat row objects that share the same keys. Output ONLY JSON — no code fences, no explanation.',
  json: 'Turn the content into a single JSON value (object or array) that captures its structure. Output ONLY JSON — no code fences, no explanation.',
  'stat-cards':
    'Extract the key metrics from the content as a flat JSON object mapping a short label to a scalar value. Output ONLY JSON — no code fences, no explanation.',
  markdown: 'Reformat the content as clean, well-structured Markdown. Output ONLY the Markdown.',
  text: 'Return the content as readable plain text. Output ONLY the text.',
};

export function createVisualizeRoutes(
  assertAuthorized: AssertAuthorized,
): Hono<{ Variables: AuthVariables & TenantVariables }> {
  const routes = new Hono<{ Variables: AuthVariables & TenantVariables }>();

  // Convert an arbitrary upstream output into a specific render format via an LLM.
  // Same abuse gate as workflow execution (per-IP rate limit + optional Turnstile).
  routes.post('/adapt', async (c) => {
    await assertAuthorized(c, 'workflows:execute', { kind: 'workflows' });

    const blocked = await guardExecution(c);
    if (blocked) {
      return blocked;
    }

    if (!env.OPENROUTER_API_KEY) {
      return c.json({ code: 'adapt_disabled', message: 'AI adapt is not configured on this server.' }, 501);
    }

    const parsed = z.safeParse(adaptSchema, await c.req.json());
    if (!parsed.success) {
      return c.json({ code: 'validation_error', message: 'Request body failed validation' }, 400);
    }
    const { content, format } = parsed.data;

    try {
      const openrouter = createOpenRouter({ apiKey: env.OPENROUTER_API_KEY });
      const result = await generateText({
        model: openrouter.chat(env.AI_MODEL),
        system: FORMAT_PROMPTS[format],
        prompt: content,
      });
      return c.json({ output: result.text });
    } catch (error) {
      logger.error('adapt failed', { error: error instanceof Error ? error.message : String(error) });
      return c.json({ code: 'adapt_failed', message: 'Could not adapt the content.' }, 502);
    }
  });

  return routes;
}
