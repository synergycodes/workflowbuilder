import { jsonSchema, tool } from 'ai';

const TAVILY_ENDPOINT = 'https://api.tavily.com/search';
const MAX_RESULTS = 5;

type TavilyResult = { title: string; url: string; content: string };
type TavilyResponse = { answer?: string; results?: TavilyResult[] };

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
