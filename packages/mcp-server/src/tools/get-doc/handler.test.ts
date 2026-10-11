import { buildFixtureCorpus } from '../../__fixtures__/fixtures.js';
import { budget as defaultBudget } from '../../config/budget.js';
import { DocsEngine } from '../../docs/docs-search.js';
import { createGetDocHandler } from './handler.js';

const corpus = await buildFixtureCorpus();
const handler = createGetDocHandler(corpus.docs, undefined, corpus.symbols);

interface Output {
  id: string;
  title: string;
  section?: string;
  description: string;
  url: string;
  content: string;
  truncated: boolean;
  sections?: { id: string; title: string }[];
}

const section = (anchor: string, content: string) => ({
  id: `p#${anchor}`,
  pageId: 'p',
  anchor,
  title: anchor,
  content,
  chunkIds: [],
  subAnchors: [],
  order: 0,
});

describe('get_doc', () => {
  it('returns a whole page', async () => {
    const output = (await handler({ id: 'guides/basic' })) as Output;
    expect(output).toMatchObject({
      id: 'guides/basic',
      title: 'Basic guide',
      description: 'A guide that uses many components.',
      url: 'https://www.workflowbuilder.io/docs/guides/basic/',
      truncated: false,
    });
    expect(output.content).toContain('## Install');
    expect(output.sections).toBeUndefined();
  });

  it('returns one section with its anchor url', async () => {
    const output = (await handler({ id: 'guides/basic#media' })) as Output;
    expect(output.section).toBe('Media');
    expect(output.url).toBe('https://www.workflowbuilder.io/docs/guides/basic/#media');
    expect(output.content.startsWith('## Media')).toBe(true);
    expect(output.content).not.toContain('## Install');
  });

  it('accepts links, urls, extensions and chunk ids', async () => {
    for (const id of [
      '/guides/basic/',
      'https://www.workflowbuilder.io/docs/guides/basic/',
      'guides/basic.mdx',
      '/docs/guides/basic#media~2',
    ]) {
      const output = (await handler({ id })) as Output;
      expect(output.id.startsWith('guides/basic')).toBe(true);
    }
  });

  it('resolves a folder index', async () => {
    expect(((await handler({ id: '/nodes/' })) as Output).id).toBe('nodes');
  });

  it('cuts long pages and lists section ids', async () => {
    const small = createGetDocHandler(corpus.docs, {
      ...defaultBudget,
      getDoc: { maxResponseTokens: 100 },
    });
    const output = (await small({ id: 'guides/long' })) as Output;
    expect(output.truncated).toBe(true);
    expect(output.content).toBe('Intro paragraph of the long page.');
    expect(output.sections?.map((section) => section.id)).toEqual([
      'guides/long#big',
      'guides/long#flat',
      'guides/long#small',
    ]);
  });

  it('keeps the serialised payload within the cap', async () => {
    for (const maxResponseTokens of [200, 300, 400]) {
      const small = createGetDocHandler(corpus.docs, { ...defaultBudget, getDoc: { maxResponseTokens } });
      for (const id of ['guides/long', 'guides/long#big', 'guides/basic']) {
        const output = await small({ id });
        expect(Math.ceil(JSON.stringify(output).length / 4)).toBeLessThanOrEqual(maxResponseTokens);
      }
    }
  });

  it('cuts an oversized section where the cap falls', async () => {
    const small = createGetDocHandler(corpus.docs, { ...defaultBudget, getDoc: { maxResponseTokens: 150 } });
    const output = (await small({ id: 'guides/long#big' })) as Output;
    expect(output.truncated).toBe(true);
    expect(output.content.startsWith('## Big')).toBe(true);
    expect(output.content.endsWith('…[truncated]')).toBe(true);
  });

  it('resolves an H3 anchor to its H2 section', async () => {
    const output = (await handler({ id: 'guides/long#second-part' })) as Output;
    expect(output).toMatchObject({ id: 'guides/long#big', section: 'Big' });
    const viaUrl = (await handler({ id: 'https://www.workflowbuilder.io/docs/guides/long/#third-part' })) as Output;
    expect(viaUrl.id).toBe('guides/long#big');
  });

  it('resolves every chunk url and id the search returns', async () => {
    for (const chunk of corpus.docs.chunks.values()) {
      expect((await handler({ id: chunk.url })) as Output).toMatchObject({ truncated: false });
      expect((await handler({ id: chunk.chunkId })) as Output).toMatchObject({ truncated: false });
    }
  });

  it('accepts the in-page link form of a section', async () => {
    expect(((await handler({ id: '/guides/basic/#media' })) as Output).id).toBe('guides/basic#media');
  });

  it('points an API reference link to get_symbol', async () => {
    await expect(handler({ id: '/api/core/widgetprops/' })).rejects.toThrow('Use get_symbol with "sdk:WidgetProps"');
    await expect(handler({ id: '/api/core/nosuchthing/' })).rejects.toThrow(
      'Use get_symbol with the symbol name "nosuchthing"',
    );
    await expect(handler({ id: '/ui-api/components/shared/' })).rejects.toThrow('sdk:Shared, ui:Shared');
  });

  it('leaves heading-only sections out of the section list', async () => {
    const sections = [
      section('_intro', 'Intro. '.repeat(200)),
      section('empty', '## empty'),
      section('full', '## full\n\nText.'),
    ];
    const engine = new DocsEngine({
      pages: [
        {
          id: 'p',
          title: 'P',
          description: '',
          url: 'u',
          content: sections.map((item) => item.content).join('\n\n'),
          sectionIds: sections.map((item) => item.id),
        },
      ],
      sections,
      chunks: [],
    });
    const small = createGetDocHandler(engine, { ...defaultBudget, getDoc: { maxResponseTokens: 150 } });
    const output = (await small({ id: 'p' })) as Output;
    expect(output.sections).toEqual([{ id: 'p#full', title: 'full' }]);
  });

  it('reports a missing document with suggestions', async () => {
    await expect(handler({ id: 'guides/bas' })).rejects.toThrow(
      'Document not found: guides/bas. Did you mean: guides/basic?',
    );
    await expect(handler({ id: 'zzz/yyy' })).rejects.toThrow(/^Document not found: zzz\/yyy$/);
    await expect(handler({ id: 'guides/basic#nope' })).rejects.toThrow('Document not found: guides/basic#nope');
  });

  it.each([
    [{}, 'Id parameter is required'],
    [{ id: ' ' }, 'cannot be empty'],
    [{ id: 'a'.repeat(501) }, 'too long'],
    [{ id: 'a\0b' }, 'NUL'],
    [{ id: '../x' }, 'Invalid document id'],
  ])('rejects %j', async (input, message) => {
    await expect(handler(input)).rejects.toThrow(message);
  });
});
