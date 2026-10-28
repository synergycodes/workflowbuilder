import { buildFixtureCorpus } from '../../__fixtures__/fixtures.js';
import { budget as defaultBudget } from '../../config/budget.js';
import { estimateTokens } from '../../search/tokens.js';
import type { SymbolHit } from '../../symbols/symbol-search.js';
import { createSearchSymbolsHandler, formatSearchSymbols } from './handler.js';

const corpus = await buildFixtureCorpus();
const handler = createSearchSymbolsHandler(corpus.symbols);

interface Output {
  results: {
    id: string;
    kind: string;
    package: string;
    importPath: string;
    signature: string;
    summary?: string;
  }[];
}

describe('search_symbols', () => {
  it('returns the documented shape', async () => {
    const output = (await handler({ query: 'WidgetProps' })) as Output;
    expect(output.results[0]).toEqual({
      id: 'sdk:WidgetProps',
      kind: 'interface',
      package: 'sdk',
      importPath: 'fixture-alpha',
      signature: 'interface WidgetProps { title: string; width?: number; onClick(event: string): void }',
      summary: 'Props accepted by the widget.',
    });
  });

  it('names members by id only and omits summary when there is none', async () => {
    const output = (await handler({ query: 'title', kind: 'property' })) as Output;
    const member = output.results.find((result) => result.id === 'sdk:WidgetProps.title');
    expect(member).not.toHaveProperty('parent');
    expect(member).not.toHaveProperty('name');
    const noSummary = (await handler({ query: 'Engine', kind: 'class' })) as Output;
    expect(noSummary.results[0].summary).toBe('A class with a constructor.');
    const none = (await handler({ query: 'flow' })) as Output;
    expect(none.results[0]).not.toHaveProperty('summary');
  });

  it('filters by package and kind', async () => {
    const output = (await handler({ query: 'Shared', package: 'ui' })) as Output;
    expect(output.results.map((result) => result.id)).toEqual(['ui:Shared']);
    const byKind = (await handler({ query: 'Shared', kind: 'function' })) as Output;
    expect(byKind.results.map((result) => result.id)).toEqual(['sdk:Shared']);
  });

  it('limits the result count', async () => {
    const output = (await handler({ query: 'Shared', limit: 1 })) as Output;
    expect(output.results).toHaveLength(1);
  });

  it('explains an empty result list', async () => {
    expect(await handler({ query: 'qqqqqqqqqqzzzzzz' })).toEqual({
      results: [],
      hint: expect.stringContaining('No matching exports'),
    });
    expect(await handler({ query: 'the of' })).toMatchObject({ hint: expect.stringContaining('no searchable terms') });
  });

  it('rejects unknown parameters by name', async () => {
    await expect(handler({ query: 'Node', kinds: 'interface' })).rejects.toThrow('Unknown parameter: kinds');
  });

  it.each([
    [{}, 'Query parameter is required'],
    [{ query: ' ' }, 'cannot be empty'],
    [{ query: 'a', package: 'core' }, 'Package must be one of'],
    [{ query: 'a', kind: 'module' }, 'Kind must be one of'],
    [{ query: 'a', limit: 51 }, 'must not exceed 50'],
    [{ query: 'a', limit: 0 }, 'at least 1'],
  ])('rejects %j', async (input, message) => {
    await expect(handler(input)).rejects.toThrow(message);
  });
});

const hit = (index: number, signatureSize: number): SymbolHit => ({
  score: 1,
  item: {
    id: `sdk:S${index}`,
    name: `S${index}`,
    kind: 'type',
    package: 'sdk',
    importPath: '@x/sdk',
    typeOnly: true,
    signature: 'x'.repeat(signatureSize),
    description: '',
    summary: 'word '.repeat(100),
    source: 'a.ts:1',
    members: [],
  },
});

describe('formatSearchSymbols budgets', () => {
  it('prints the signature on one line', () => {
    const multiline = { ...hit(1, 0), item: { ...hit(1, 0).item, signature: 'type A = {\n  a: string;\n}' } };
    expect(formatSearchSymbols([multiline], 10).results[0].signature).toBe('type A = { a: string; }');
  });

  it('caps signature and summary length', () => {
    const { results } = formatSearchSymbols([hit(1, 5000)], 10);
    expect(estimateTokens(results[0].signature)).toBeLessThanOrEqual(defaultBudget.searchSymbols.maxSignatureTokens);
    expect(estimateTokens(results[0].summary ?? '')).toBeLessThanOrEqual(defaultBudget.searchSymbols.maxSummaryTokens);
  });

  it('flags hits dropped for size with their total', () => {
    const budget = { ...defaultBudget, searchSymbols: { ...defaultBudget.searchSymbols, maxResponseTokens: 150 } };
    const hits = Array.from({ length: 20 }, (_, index) => hit(index, 400));
    const output = formatSearchSymbols(hits, 20, budget);
    expect(output).toMatchObject({ truncated: true, total: 20 });
    expect(output.results.length).toBeLessThan(20);
    expect(formatSearchSymbols(hits, 3)).toEqual({ results: expect.any(Array) });
  });

  it('stops at the response budget but keeps at least one result', () => {
    const budget = { ...defaultBudget, searchSymbols: { ...defaultBudget.searchSymbols, maxResponseTokens: 150 } };
    expect(
      formatSearchSymbols(
        Array.from({ length: 20 }, (_, index) => hit(index, 400)),
        20,
        budget,
      ).results.length,
    ).toBeLessThan(20);
    const tiny = { ...defaultBudget, searchSymbols: { ...defaultBudget.searchSymbols, maxResponseTokens: 1 } };
    expect(formatSearchSymbols([hit(1, 400), hit(2, 400)], 20, tiny).results).toHaveLength(1);
  });
});
