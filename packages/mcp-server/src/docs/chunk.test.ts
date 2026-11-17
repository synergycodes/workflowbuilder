import { chunkPage, createAnchorSlugger } from './chunk.js';

const base = { pageId: 'guides/page', title: 'Page', description: 'Page description.' };
const config = { maxChunkTokens: 1000, splitAtH3: true, indexCode: true };

function chunk(markdown: string, overrides: Partial<typeof config> = {}, extra: { badge?: string } = {}) {
  return chunkPage({ ...base, ...extra, markdown }, { ...config, ...overrides });
}

describe('anchors', () => {
  it('slugs plain and code headings', () => {
    const slug = createAnchorSlugger();
    expect(slug('Props reference')).toBe('props-reference');
    expect(slug('`registerComponentDecorator`')).toBe('registercomponentdecorator');
  });

  it('suffixes duplicate headings', () => {
    const slug = createAnchorSlugger();
    expect([slug('Same'), slug('Same'), slug('Same')]).toEqual(['same', 'same-1', 'same-2']);
  });
});

describe('sections', () => {
  it('treats text before the first H2 as the intro', () => {
    const { sections, chunks } = chunk('Intro text.\n\n## Alpha\n\nBody.\n');
    expect(sections.map((section) => section.id)).toEqual(['guides/page#_intro', 'guides/page#alpha']);
    expect(chunks[0]).toMatchObject({ section: 'Page', url: 'https://www.workflowbuilder.io/docs/guides/page/' });
    expect(chunks[1]).toMatchObject({
      section: 'Alpha',
      url: 'https://www.workflowbuilder.io/docs/guides/page/#alpha',
    });
  });

  it('has only an intro for a page without H2', () => {
    const { sections } = chunk('Just text.\n');
    expect(sections.map((section) => section.id)).toEqual(['guides/page#_intro']);
  });

  it('skips a blank intro', () => {
    const { sections } = chunk('## Alpha\n\nBody.\n');
    expect(sections.map((section) => section.id)).toEqual(['guides/page#alpha']);
  });

  it('suffixes duplicate H2 anchors', () => {
    const { sections } = chunk('## Same\n\na\n\n## Same\n\nb\n');
    expect(sections.map((section) => section.anchor)).toEqual(['same', 'same-1']);
  });

  it('keeps the heading line in the content', () => {
    const { chunks } = chunk('## Alpha\n\nBody.\n');
    expect(chunks[0].content).toBe('## Alpha\n\nBody.');
  });
});

describe('indexed fields', () => {
  it('puts the H2 and deeper headings in headings and strips them from the body', () => {
    const { chunks } = chunk('## Alpha\n\nText.\n\n### Deep\n\nMore.\n\n#### Deeper\n\nEnd.\n');
    expect(chunks[0].headings).toBe('Alpha\nDeep\nDeeper');
    expect(chunks[0].body).not.toContain('Alpha');
    expect(chunks[0].body).toContain('More.');
  });

  it('adds description and badge to the intro chunk only', () => {
    const { chunks } = chunk('Intro.\n\n## Alpha\n\nBody.\n', {}, { badge: 'Enterprise' });
    expect(chunks[0].description).toBe('Page description. Enterprise');
    expect(chunks[1].description).toBe('');
  });

  it('puts the description on the first chunk of a page without an intro', () => {
    const { chunks } = chunk('## Alpha\n\nBody.\n\n## Beta\n\nMore.\n');
    expect(chunks.map((item) => item.description)).toEqual(['Page description.', '']);
    expect(chunks.map((item) => item.pageDescription)).toEqual(['', 'Page description.']);
  });

  it('puts the page description on every chunk but the intro', () => {
    const { chunks } = chunk('Intro.\n\n## Alpha\n\nBody.\n', {}, { badge: 'Enterprise' });
    expect(chunks.map((item) => item.pageDescription)).toEqual(['', 'Page description. Enterprise']);
  });

  it('leaves code out of the body when indexCode is off', () => {
    const { chunks } = chunk('## Alpha\n\nProse.\n\n```ts\nsecretCode();\n```\n', { indexCode: false });
    expect(chunks[0].body).toBe('Prose.');
    expect(chunks[0].content).toContain('secretCode');
  });

  it('leaves list items that open with a docs link out of the body', () => {
    const markdown =
      '## See also\n\n- [Theming](/get-started/theming/) - dark mode\n- Uses [tokens](/ui-library/design-tokens/) inline\n';
    const { chunks } = chunk(markdown);
    expect(chunks[0].body).toBe('- Uses [tokens](/ui-library/design-tokens/) inline');
    expect(chunks[0].content).toContain('dark mode');
  });
});

const longParagraph = (word: string, times = 40) => `${word} `.repeat(times).trim();

describe('unranked link lists', () => {
  it.each(['-', '*', '+', '1.', '1)'])('keeps "%s" link items out of the body', (marker) => {
    const { chunks } = chunk(`## Next\n\nProse.\n\n${marker} [Theming](/docs/theming/)\n`);
    expect(chunks[0].body).toContain('Prose.');
    expect(chunks[0].body).not.toContain('Theming');
  });
});

describe('splitting', () => {
  it('splits an oversize section at H3 and keeps the pre-H3 text with the H2', () => {
    const markdown = `## Big\n\nLead.\n\n### One\n\n${longParagraph('one')}\n\n### Two\n\n${longParagraph('two')}\n`;
    const { chunks, sections } = chunk(markdown, { maxChunkTokens: 60 });
    expect(chunks.map((item) => item.chunkId)).toEqual(['guides/page#big', 'guides/page#big~2', 'guides/page#big~3']);
    expect(chunks[0].content).toBe('## Big\n\nLead.');
    expect(chunks[1]).toMatchObject({
      section: 'Big › One',
      url: 'https://www.workflowbuilder.io/docs/guides/page/#one',
    });
    expect(chunks[1].headings).toBe('Big\nOne');
    expect(sections[0].chunkIds).toHaveLength(3);
    expect(sections[0].content).toContain('### Two');
  });

  it('does not split at H3 when splitAtH3 is off', () => {
    const markdown = `## Big\n\n### One\n\n${longParagraph('one')}\n\n### Two\n\n${longParagraph('two')}\n`;
    const { chunks } = chunk(markdown, { maxChunkTokens: 60, splitAtH3: false });
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.every((item) => item.section === 'Big')).toBe(true);
  });

  it('packs top-level blocks greedily when there is no H3', () => {
    const markdown = `## Flat\n\n${longParagraph('a', 70)}\n\n${longParagraph('b', 70)}\n\n${longParagraph('c', 70)}\n`;
    const { chunks } = chunk(markdown, { maxChunkTokens: 60 });
    expect(chunks).toHaveLength(3);
    expect(chunks.map((item) => item.chunkId)).toEqual([
      'guides/page#flat',
      'guides/page#flat~2',
      'guides/page#flat~3',
    ]);
  });

  it('never cuts a single oversize block', () => {
    const fence = `\`\`\`ts\n${'const value = 1;\n'.repeat(60)}\`\`\``;
    const { chunks } = chunk(`## Flat\n\n${fence}\n`, { maxChunkTokens: 60 });
    const holder = chunks.find((item) => item.content.includes('```ts'));
    expect(holder?.content.endsWith('```')).toBe(true);
    expect(holder?.content.match(/const value/g)).toHaveLength(60);
  });
});
