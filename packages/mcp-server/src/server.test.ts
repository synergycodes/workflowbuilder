import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';

import { buildFixtureCorpus } from './__fixtures__/fixtures.js';
import { budget } from './config/budget.js';
import { callTool, createMcpServer, createToolRegistry } from './server.js';
import { GET_DOC_TOOL } from './tools/get-doc/tool.config.js';
import { GET_SYMBOL_TOOL } from './tools/get-symbol/tool.config.js';
import { SEARCH_DOCS_TOOL } from './tools/search-docs/tool.config.js';
import { SEARCH_SYMBOLS_TOOL } from './tools/search-symbols/tool.config.js';

const corpus = await buildFixtureCorpus();
const registry = createToolRegistry(corpus);

describe('callTool', () => {
  it('wraps a result as one compact text item', async () => {
    const result = await callTool(registry, 'search_docs', { query: 'Plain' });
    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe('text');
    expect(result).not.toHaveProperty('isError');
    expect(result.content[0].text).toBe(JSON.stringify(JSON.parse(result.content[0].text)));
  });

  it('turns non-object arguments into an error', async () => {
    for (const arguments_ of [undefined, null, 'x', 3]) {
      const result = await callTool(registry, 'search_docs', arguments_);
      expect(result).toMatchObject({ isError: true });
      expect(JSON.parse(result.content[0].text)).toEqual({ error: 'Invalid arguments: expected an object' });
    }
  });

  it('turns a thrown error into isError with an error body', async () => {
    const result = await callTool(registry, 'get_doc', { id: 'zzz/yyy' });
    expect(result).toMatchObject({ isError: true });
    expect(JSON.parse(result.content[0].text)).toEqual({ error: 'Document not found: zzz/yyy' });
  });

  it('reports an unknown tool', async () => {
    const result = await callTool(registry, 'nope', {});
    expect(result).toMatchObject({ isError: true });
    expect(JSON.parse(result.content[0].text)).toEqual({ error: 'Unknown tool: nope' });
  });

  it('joins validation messages into one line', async () => {
    const result = await callTool(registry, 'search_symbols', { limit: 0 });
    const { error } = JSON.parse(result.content[0].text) as { error: string };
    expect(error).toContain('Query parameter is required');
    expect(error).toContain('Limit parameter must be at least 1');
    expect(error).not.toContain('\n');
  });
});

describe('MCP server over an in-memory transport', () => {
  it('lists the four tools with the configured descriptions', async () => {
    const server = createMcpServer(registry, '0.0.0');
    const client = new Client({ name: 'test', version: '0.0.0' });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);

    const { tools } = await client.listTools();
    expect(tools.map((tool) => tool.name)).toEqual(['search_docs', 'get_doc', 'search_symbols', 'get_symbol']);
    const expected = [SEARCH_DOCS_TOOL, GET_DOC_TOOL, SEARCH_SYMBOLS_TOOL, GET_SYMBOL_TOOL];
    expect(tools.map((tool) => tool.description)).toEqual(expected.map((tool) => tool.description));

    for (const [tool, maximum] of [
      [SEARCH_DOCS_TOOL, budget.searchDocs.maxLimit],
      [SEARCH_SYMBOLS_TOOL, budget.searchSymbols.maxLimit],
    ] as const) {
      expect(tool.inputSchema.properties.limit).toMatchObject({ type: 'integer', minimum: 1, maximum });
      expect(tool.inputSchema.additionalProperties).toBe(false);
    }

    const result = await client.callTool({ name: 'get_symbol', arguments: { name: 'sdk:Engine' } });
    expect(JSON.parse((result.content as { text: string }[])[0].text)).toMatchObject({ id: 'sdk:Engine' });

    await client.close();
    await server.close();
  });
});
