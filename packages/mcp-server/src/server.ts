import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

import { type BudgetConfig, budget as defaultBudget } from './config/budget.js';
import type { Corpus } from './corpus/build-corpus.js';
import { GET_DOC_TOOL, createGetDocHandler } from './tools/get-doc/index.js';
import { GET_SYMBOL_TOOL, createGetSymbolHandler } from './tools/get-symbol/index.js';
import { SEARCH_DOCS_TOOL, createSearchDocsHandler } from './tools/search-docs/index.js';
import { SEARCH_SYMBOLS_TOOL, createSearchSymbolsHandler } from './tools/search-symbols/index.js';
import type { ToolDefinition, ToolHandler } from './tools/types.js';

const SERVER_NAME = 'wb-docs';

interface ToolRegistry {
  definitions: ToolDefinition[];
  handlers: Map<string, ToolHandler>;
}

export function createToolRegistry(corpus: Pick<Corpus, 'docs' | 'symbols'>, budget: BudgetConfig = defaultBudget) {
  const handlers = new Map<string, ToolHandler>([
    [SEARCH_DOCS_TOOL.name, createSearchDocsHandler(corpus.docs, budget)],
    [GET_DOC_TOOL.name, createGetDocHandler(corpus.docs, budget, corpus.symbols)],
    [SEARCH_SYMBOLS_TOOL.name, createSearchSymbolsHandler(corpus.symbols, budget)],
    [GET_SYMBOL_TOOL.name, createGetSymbolHandler(corpus.symbols, budget)],
  ]);
  const definitions = [SEARCH_DOCS_TOOL, GET_DOC_TOOL, SEARCH_SYMBOLS_TOOL, GET_SYMBOL_TOOL];
  return { definitions, handlers } satisfies ToolRegistry;
}

function textResult(payload: unknown, isError: boolean) {
  return {
    content: [{ type: 'text' as const, text: JSON.stringify(payload) }],
    ...(isError ? { isError: true } : {}),
  };
}

export async function callTool(registry: ToolRegistry, name: string, arguments_: unknown) {
  try {
    const handler = registry.handlers.get(name);
    if (!handler) throw new Error(`Unknown tool: ${name}`);
    if (arguments_ === undefined || arguments_ === null || typeof arguments_ !== 'object') {
      throw new Error('Invalid arguments: expected an object');
    }
    return textResult(await handler(arguments_), false);
  } catch (error) {
    return textResult({ error: error instanceof Error ? error.message : 'Unknown error occurred' }, true);
  }
}

export function createMcpServer(registry: ToolRegistry, version: string) {
  const server = new Server({ name: SERVER_NAME, version }, { capabilities: { tools: {} } });
  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: registry.definitions }));
  server.setRequestHandler(CallToolRequestSchema, async (request) =>
    callTool(registry, request.params.name, request.params.arguments),
  );
  return server;
}
