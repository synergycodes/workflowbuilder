import { buildFixtureCorpus } from '../../__fixtures__/fixtures.js';
import { budget as defaultBudget } from '../../config/budget.js';
import type { DocsHit } from '../../docs/docs-search.js';
import { estimateTokens } from '../../search/tokens.js';
import { createSearchDocsHandler, formatSearchDocs } from './handler.js';

const corpus = await buildFixtureCorpus();
const handler = createSearchDocsHandler(corpus.docs);

describe('search_docs', () => {
  it('returns ranked sections with the documented shape', async () => {
    const output = (await handler({ query: 'Duplicate Same' })) as { results: Record<string, unknown>[] };
    expect(output.results.length).toBeGreaterThan(0);
    expect(Object.keys(output.results[0]).sort()).toEqual(['content', 'id', 'section', 'title', 'url']);
    expect(output.results[0].id).toMatch(/^guides\/basic#/);
  });

  it('explains an empty result list', async () => {
    expect(await handler({ query: 'qqqqqqqqqqzzzzzz' })).toEqual({
      results: [],
      hint: expect.stringContaining('No matching sections'),
    });
    expect(await handler({ query: 'the of a' })).toEqual({
      results: [],
      hint: expect.stringContaining('no searchable terms'),
    });
    expect(await handler({ query: '工作流程 節点' })).toMatchObject({ results: [], hint: expect.any(String) });
  });

  it('rejects unknown parameters by name and names the field of a type error', async () => {
    await expect(handler({ query: 'a', package: 'sdk', kinds: 'x' })).rejects.toThrow(
      'Unknown parameters: package, kinds',
    );
    await expect(handler({ query: 123 })).rejects.toThrow('Parameter "query": Expected string, received number');
  });

  it('uses the default limit and honours an explicit one', async () => {
    const many = (await handler({ query: 'page' })) as { results: unknown[] };
    expect(many.results.length).toBeLessThanOrEqual(defaultBudget.searchDocs.defaultLimit);
    const one = (await handler({ query: 'page', limit: 1 })) as { results: unknown[] };
    expect(one.results).toHaveLength(1);
  });

  it.each([
    [{}, 'Query parameter is required'],
    [{ query: '   ' }, 'Query parameter cannot be empty'],
    [{ query: 'x'.repeat(1001) }, 'too long'],
    [{ query: 'a', limit: 0 }, 'at least 1'],
    [{ query: 'a', limit: 21 }, 'must not exceed 20'],
    [{ query: 'a', limit: 1.5 }, 'integer'],
    [{ query: 1 }, 'Expected string'],
  ])('rejects %j', async (input, message) => {
    await expect(handler(input)).rejects.toThrow(message);
  });

  it('serializes to compact json', async () => {
    const output = await handler({ query: 'Plain', limit: 1 });
    expect(JSON.stringify(output)).not.toContain('\n  ');
  });
});

const chunk = (index: number, size: number, content = `line\n`.repeat(size / 5)): DocsHit => ({
  score: 1,
  chunk: {
    chunkId: `p#${index}`,
    sectionId: `p#${index}`,
    pageId: 'p',
    title: 'T',
    section: 'Parent › Setup x',
    url: 'u',
    content,
    headings: '',
    description: '',
    pageDescription: '',
    body: '',
    order: index,
  },
});

describe('formatSearchDocs budgets', () => {
  it('flags hits dropped for size with their total', () => {
    const small = { ...defaultBudget, searchDocs: { ...defaultBudget.searchDocs, maxResponseTokens: 600 } };
    const hits = Array.from({ length: 8 }, (_, index) => chunk(index, 4400));
    const output = formatSearchDocs(hits, 5, small);
    expect(output).toMatchObject({ truncated: true, total: 8, hint: expect.stringContaining('Narrow the query') });
    expect(formatSearchDocs(hits, 5)).not.toHaveProperty('truncated');
  });

  it('does not flag results cut only by the limit', () => {
    const hits = Array.from({ length: 8 }, (_, index) => chunk(index, 100));
    expect(formatSearchDocs(hits, 3)).toEqual({ results: expect.any(Array) });
  });

  it('starts the excerpt at the query terms when they sit past the first excerpt', () => {
    const filler = 'Unrelated filler sentence about something else entirely. '.repeat(40);
    const answer = 'The canvas handles roughly 500 nodes before performance degrades.';
    const hit = chunk(1, 0, `${filler}\n\n${answer}\n\n${filler}`);
    const withQuery = formatSearchDocs([hit], 5, defaultBudget, 'how many nodes can the canvas handle performance');
    expect(withQuery.results[0].content).toContain(answer);
    expect(withQuery.results[0].content.startsWith('…\n')).toBe(true);
    expect(withQuery.results[0].content.length).toBeLessThanOrEqual(defaultBudget.searchDocs.maxExcerptChars + 5);
    const withoutQuery = formatSearchDocs([hit], 5, defaultBudget);
    expect(withoutQuery.results[0].content.startsWith('Unrelated')).toBe(true);
  });

  it('keeps the section head when the query terms are already in it', () => {
    const hit = chunk(1, 0, `The canvas handles many nodes.\n\n${'filler words here. '.repeat(200)}`);
    const [result] = formatSearchDocs([hit], 5, defaultBudget, 'canvas nodes').results;
    expect(result.content.startsWith('The canvas')).toBe(true);
  });

  it('reopens a code fence when the excerpt starts inside one', () => {
    const code = `${'const filler = 1;\n'.repeat(80)}const needleTerm = 2;\n${'const more = 3;\n'.repeat(80)}`;
    const hit = chunk(1, 0, `Intro text.\n\n\`\`\`ts\n${code}\`\`\`\n`);
    const [result] = formatSearchDocs([hit], 5, defaultBudget, 'needleTerm').results;
    const fences = result.content.split('\n').filter((line) => line.startsWith('```'));
    expect(result.content).toContain('needleTerm');
    expect(fences.length % 2).toBe(0);
  });

  it('cuts content to an excerpt of at most maxExcerptChars', () => {
    const { results } = formatSearchDocs([chunk(1, 20_000)], 5);
    expect(results[0].truncated).toBe(true);
    expect(results[0].content.endsWith('…')).toBe(true);
    expect(results[0].content.length).toBeLessThanOrEqual(defaultBudget.searchDocs.maxExcerptChars + 1);
    expect(formatSearchDocs([chunk(1, 50)], 5).results[0]).not.toHaveProperty('truncated');
  });

  it('drops the opening heading the section field already names', () => {
    const [result] = formatSearchDocs([chunk(1, 0, '### Setup `x`\n\nBody text.')], 5).results;
    expect(result.content).toBe('Body text.');
    const [other] = formatSearchDocs([chunk(1, 0, '### Other\n\nBody text.')], 5).results;
    expect(other.content).toBe('### Other\n\nBody text.');
  });

  it('stops adding results at the response budget but always returns one', () => {
    const small = { ...defaultBudget, searchDocs: { ...defaultBudget.searchDocs, maxResponseTokens: 600 } };
    const hits = Array.from({ length: 5 }, (_, index) => chunk(index, 4400));
    const { results } = formatSearchDocs(hits, 5, small);
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results.length).toBeLessThan(5);
    expect(estimateTokens(JSON.stringify({ results }))).toBeLessThanOrEqual(small.searchDocs.maxResponseTokens);
    expect(
      formatSearchDocs([chunk(1, 40_000)], 5, {
        ...defaultBudget,
        searchDocs: { ...defaultBudget.searchDocs, maxResponseTokens: 10 },
      }).results,
    ).toHaveLength(1);
  });
});
