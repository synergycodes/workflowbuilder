import { jsonSchema, tool } from 'ai';

// Tavily is a search API built for LLM agents: it returns a short synthesized
// answer plus clean snippets, so we feed the model far fewer tokens than raw
// SERP JSON would. `search_depth: 'basic'` is the cheapest tier (1 credit).
const TAVILY_ENDPOINT = 'https://api.tavily.com/search';
const MAX_RESULTS = 5;

type TavilyResult = { title: string; url: string; content: string };
type TavilyResponse = { answer?: string; results?: TavilyResult[] };

/**
 * Web-search tool for the AI Agent node, backed by Tavily. The agent decides
 * when to call it; the AI SDK runs the call/execute/continue loop internally
 * (no graph cycles, so it stays compatible with the DAG runner). Search errors
 * are returned to the model as a soft error rather than thrown, so a flaky
 * lookup degrades the answer instead of failing the whole node.
 */
export function createWebSearchTool(apiKey: string) {
  return tool({
    description:
      'Search the web for current or external information. Use it when the answer needs up-to-date facts, recent events, or sources that were not provided. Returns a short answer plus the top result snippets with URLs.',
    inputSchema: jsonSchema<{ query: string }>({
      type: 'object',
      properties: {
        query: { type: 'string', description: 'The search query' },
      },
      required: ['query'],
      additionalProperties: false,
    }),
    execute: async ({ query }) => {
      try {
        const response = await fetch(TAVILY_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            query,
            search_depth: 'basic',
            max_results: MAX_RESULTS,
            include_answer: true,
          }),
        });

        if (!response.ok) {
          return { error: `Web search failed (HTTP ${response.status}).` };
        }

        const data = (await response.json()) as TavilyResponse;
        return {
          answer: data.answer ?? '',
          results: (data.results ?? []).slice(0, MAX_RESULTS).map((result) => ({
            title: result.title,
            url: result.url,
            snippet: result.content,
          })),
        };
      } catch (error) {
        return { error: error instanceof Error ? error.message : 'Web search failed.' };
      }
    },
  });
}
