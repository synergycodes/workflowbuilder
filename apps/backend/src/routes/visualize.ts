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

const FORMAT_PROMPTS: Record<z.infer<typeof adaptSchema>['format'], string> = {
  diagram: `You reshape content into a Mermaid diagram so it can be rendered as one. Choose the diagram type that best represents the content: a flowchart (\`flowchart TD\`) for processes/steps/dependencies, a \`sequenceDiagram\` for interactions over time.
Rules:
- Output ONLY the raw Mermaid source. No code fences, no commentary.
- Begin with a valid declaration and direction, e.g. \`flowchart TD\`.
- Keep node labels short. Wrap every label that contains a space or punctuation in double quotes, e.g. \`A["Fix export bug"]\`. Never put parentheses, semicolons, colons, or unescaped quotes inside a label.
- Aim for 4-12 nodes; connect them to show the real relationships.
- Use only facts from the content. Do not invent steps.`,
  chart: `You reshape content into chart data so it can be rendered as a chart. Find a categorical dimension and a numeric measure in the content.
Rules:
- Output ONLY JSON. No code fences, no commentary.
- Shape: a JSON array like [{"label":"Q1","value":42}], OR {"type":"bar"|"line"|"pie"|"area","data":[{"label":...,"value":...}]}.
- "value" must be a number. Aggregate or count where the content implies it (e.g. number of items per category).
- Produce 2-12 data points. Use real numbers from the content; if there are none, count occurrences. If the content has nothing quantifiable, output [].`,
  table: `You reshape content into a table. Output ONLY a JSON array of flat row objects that ALL share the same keys (the columns). Use concise column names, flatten nested values to short strings, and include one object per row. No code fences, no commentary. Use only facts from the content.`,
  json: `Output ONLY a single JSON value (object or array) that faithfully captures the structure of the content. No code fences, no commentary.`,
  'stat-cards': `Extract the key metrics / KPIs from the content as a flat JSON object mapping a short human label to a scalar value (string, number, or boolean), e.g. {"Open tickets":14,"Owner":"Sam"}. Use 2-8 entries, the most important first. Output ONLY JSON, no code fences, no commentary.`,
  markdown: `Reformat the content as clean, well-structured Markdown (headings, lists, bold where it helps). Keep all the information. Output ONLY the Markdown.`,
  text: `Return the content as clean, readable plain text. Output ONLY the text.`,
};

export function createVisualizeRoutes(
  assertAuthorized: AssertAuthorized,
): Hono<{ Variables: AuthVariables & TenantVariables }> {
  const routes = new Hono<{ Variables: AuthVariables & TenantVariables }>();

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
        // Low temperature for stable structured output.
        temperature: 0.2,
        prompt: `Content to convert:\n\n${content}`,
      });
      return c.json({ output: result.text.trim() });
    } catch (error) {
      logger.error('adapt failed', { error: error instanceof Error ? error.message : String(error) });
      return c.json({ code: 'adapt_failed', message: 'Could not adapt the content.' }, 502);
    }
  });

  return routes;
}
