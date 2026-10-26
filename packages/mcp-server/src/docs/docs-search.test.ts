import { type DocsRanking, ranking as defaultRanking } from '../config/ranking.js';
import { type DocsData, DocsEngine } from './docs-search.js';
import type { DocChunk } from './types.js';

function chunk(chunkId: string, fields: Partial<DocChunk>): DocChunk {
  const [pageId] = chunkId.split('#');
  return {
    chunkId,
    sectionId: chunkId.split('~')[0],
    pageId,
    title: '',
    section: '',
    url: '',
    content: '',
    headings: '',
    description: '',
    pageDescription: '',
    body: '',
    order: 0,
    ...fields,
  };
}

function dataOf(chunks: DocChunk[]): DocsData {
  const pageIds = [...new Set(chunks.map((item) => item.pageId))];
  return {
    pages: pageIds.map((id) => ({ id, title: id, description: '', url: '', content: '', sectionIds: [] })),
    sections: [],
    chunks,
  };
}

const ranking = (overrides: Partial<DocsRanking> = {}): DocsRanking => ({ ...defaultRanking.docs, ...overrides });
const synonyms = { map: {}, stopwords: [] };

describe('DocsEngine ranking', () => {
  it('ranks a heading match above a body match', () => {
    const engine = new DocsEngine(
      dataOf([
        chunk('a#body', { body: 'the palette is mentioned here only in passing' }),
        chunk('b#heading', { headings: 'Palette' }),
      ]),
      { ranking: ranking(), synonyms },
    );
    expect(engine.search('palette', 5).map((hit) => hit.chunk.chunkId)).toEqual(['b#heading', 'a#body']);
  });

  it('finds prefix and fuzzy matches', () => {
    const engine = new DocsEngine(dataOf([chunk('a#x', { headings: 'Persistence strategies' })]), {
      ranking: ranking(),
      synonyms,
    });
    expect(engine.search('persist', 5)).toHaveLength(1);
    expect(engine.search('strategis', 5)).toHaveLength(1);
  });

  it('can switch prefix matching off', () => {
    const engine = new DocsEngine(dataOf([chunk('a#x', { headings: 'Persistence' })]), {
      ranking: ranking({ prefix: false, fuzzy: 0 }),
      synonyms,
    });
    expect(engine.search('persist', 5)).toHaveLength(0);
  });

  it('matches camel case parts of a query term', () => {
    const engine = new DocsEngine(dataOf([chunk('a#x', { headings: 'Node types' })]), { ranking: ranking(), synonyms });
    expect(engine.search('nodeTypes', 5)).toHaveLength(1);
  });

  it('breaks score ties by chunk id', () => {
    const engine = new DocsEngine(
      dataOf([
        chunk('b#same', { headings: 'Same' }),
        chunk('a#same', { headings: 'Same' }),
        chunk('c#same', { headings: 'Same' }),
      ]),
      { ranking: ranking(), synonyms },
    );
    const ids = engine.search('same', 5).map((hit) => hit.chunk.chunkId);
    expect(ids).toEqual(['a#same', 'b#same', 'c#same']);
  });

  it('expands synonyms and drops stopwords at query time', () => {
    const engine = new DocsEngine(
      dataOf([chunk('a#x', { headings: 'Persistence' }), chunk('b#x', { headings: 'Other' })]),
      {
        ranking: ranking({ prefix: false, fuzzy: 0 }),
        synonyms: { map: { save: ['persistence'] }, stopwords: ['how', 'to'] },
      },
    );
    expect(engine.search('how to save', 5).map((hit) => hit.chunk.chunkId)).toEqual(['a#x']);
  });

  it('returns nothing for a blank query after stopwords', () => {
    const engine = new DocsEngine(dataOf([chunk('a#x', { headings: 'how' })]), {
      ranking: ranking(),
      synonyms: { map: {}, stopwords: ['how'] },
    });
    expect(engine.search('how', 5)).toEqual([]);
    expect(engine.search('   ', 5)).toEqual([]);
  });

  it('ranks a chunk matching more query terms above a heading match on one term', () => {
    const chunks = [
      chunk('a#hub', { headings: 'Branching' }),
      chunk('b#answer', { description: 'Branching on a condition' }),
    ];
    const coordinated = new DocsEngine(dataOf(chunks), { ranking: ranking({ rarity: false }), synonyms });
    expect(coordinated.search('branching condition', 5).map((hit) => hit.chunk.chunkId)).toEqual(['b#answer', 'a#hub']);
    const uncoordinated = new DocsEngine(dataOf(chunks), {
      ranking: ranking({ coordination: 0, rarity: false }),
      synonyms,
    });
    expect(uncoordinated.search('branching condition', 5)[0].chunk.chunkId).toBe('a#hub');
  });

  it('ranks a section higher when its page description matches the query', () => {
    const engine = new DocsEngine(
      dataOf([
        chunk('a#plain', { body: 'setup steps' }),
        chunk('b#context', { body: 'setup steps', pageDescription: 'Save diagrams in the browser' }),
      ]),
      { ranking: ranking(), synonyms },
    );
    expect(engine.search('browser setup', 5).map((hit) => hit.chunk.chunkId)).toEqual(['b#context', 'a#plain']);
  });

  it('does not count page description matches toward coverage', () => {
    const chunks = [
      chunk('a#section', { body: 'branching', pageDescription: 'condition' }),
      chunk('b#answer', { headings: 'Branching condition' }),
    ];
    const sectionScore = (coordination: number) =>
      new DocsEngine(dataOf(chunks), { ranking: ranking({ coordination }), synonyms })
        .search('branching condition', 5)
        .find((hit) => hit.chunk.chunkId === 'a#section')?.score ?? 0;
    expect(sectionScore(1)).toBeCloseTo(sectionScore(0) / 2);
  });

  it('measures README coverage against the best hit of both indexes', () => {
    const readme = chunk('readme/pkg#hub', { headings: 'Branching' });
    const options = { ranking: ranking({ readmeWeights: { pkg: 1 }, rarity: false }), synonyms };
    const readmeScore = (chunks: DocChunk[]) =>
      new DocsEngine(dataOf(chunks), options)
        .search('branching condition', 5)
        .find((hit) => hit.chunk.chunkId === readme.chunkId)?.score ?? 0;
    const alone = readmeScore([readme]);
    const withSitePage = readmeScore([readme, chunk('guide#answer', { headings: 'Branching condition' })]);
    expect(withSitePage).toBeCloseTo(alone / 2);
  });

  it('weights a rare body term above a heading match on a word common across the docs', () => {
    const chunks = [
      chunk('a#hub', { headings: 'Node' }),
      chunk('b#answer', { body: 'authorization' }),
      ...Array.from({ length: 10 }, (_, index) => chunk(`page-${index}#x`, { body: 'node' })),
    ];
    const topHit = (rarity: boolean) =>
      new DocsEngine(dataOf(chunks), { ranking: ranking({ rarity }), synonyms }).search('node authorization', 5)[0]
        .chunk.chunkId;
    expect(topHit(true)).toBe('b#answer');
    expect(topHit(false)).toBe('a#hub');
  });

  it('drops chunks that match only through the page description', () => {
    const engine = new DocsEngine(
      dataOf([
        chunk('a#intro', { description: 'Common questions.' }),
        chunk('a#other', { pageDescription: 'Common questions.', body: 'unrelated' }),
      ]),
      { ranking: ranking(), synonyms },
    );
    expect(engine.search('questions', 5).map((hit) => hit.chunk.chunkId)).toEqual(['a#intro']);
  });

  it('does not weight a term no chunk contains above a real word', () => {
    const chunks = [
      chunk('a#hub', { headings: 'editor' }),
      chunk('b#typo', { headings: 'edtor' }),
      ...Array.from({ length: 10 }, (_, index) => chunk(`page-${index}#x`, { body: 'filler' })),
    ];
    const engine = new DocsEngine(dataOf(chunks), { ranking: ranking(), synonyms });
    expect(engine.search('edtor editor', 5)[0].chunk.chunkId).toBe('a#hub');
  });

  it('respects the limit', () => {
    const chunks = ['a', 'b', 'c', 'd'].map((id) => chunk(`${id}#x`, { headings: 'topic' }));
    const engine = new DocsEngine(dataOf(chunks), { ranking: ranking(), synonyms });
    expect(engine.search('topic', 2)).toHaveLength(2);
  });
});

describe('DocsEngine suggestions', () => {
  it('suggests pages that contain the last path segment', () => {
    const engine = new DocsEngine(dataOf([chunk('guides/configuring-the-editor#x', {}), chunk('nodes#x', {})]));
    expect(engine.suggest('configuring-the-editor')).toEqual(['guides/configuring-the-editor']);
    expect(engine.suggest('guides/editor')).toEqual(['guides/configuring-the-editor']);
    expect(engine.suggest('zzz')).toEqual([]);
  });
});
