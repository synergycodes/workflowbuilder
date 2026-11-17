import {
  InvalidDocRefError,
  chunkId,
  normalizeDocRef,
  pageIdFromPath,
  pageUrl,
  sectionId,
  splitSectionId,
} from './doc-ids.js';

describe('page ids and urls', () => {
  it('derives the id from the path', () => {
    expect(pageIdFromPath('guides/configuring-the-editor.md')).toBe('guides/configuring-the-editor');
    expect(pageIdFromPath(String.raw`guides\Add-Node.mdx`)).toBe('guides/add-node');
  });

  it('removes a trailing index and keeps a root index', () => {
    expect(pageIdFromPath('nodes/index.mdx')).toBe('nodes');
    expect(pageIdFromPath('index.mdx')).toBe('index');
  });

  it('builds trailing-slash urls with an optional anchor', () => {
    expect(pageUrl('nodes')).toBe('https://www.workflowbuilder.io/docs/nodes/');
    expect(pageUrl('guides/a', 'props-reference')).toBe(
      'https://www.workflowbuilder.io/docs/guides/a/#props-reference',
    );
    expect(pageUrl('guides/a', '_intro')).toBe('https://www.workflowbuilder.io/docs/guides/a/');
  });

  it('composes section and chunk ids', () => {
    expect(sectionId('guides/a', 'props')).toBe('guides/a#props');
    expect(chunkId('guides/a#props', 0)).toBe('guides/a#props');
    expect(chunkId('guides/a#props', 2)).toBe('guides/a#props~3');
  });

  it('splits a section id', () => {
    expect(splitSectionId('guides/a#props')).toEqual({ pageId: 'guides/a', anchor: 'props' });
    expect(splitSectionId('guides/a')).toEqual({ pageId: 'guides/a', anchor: undefined });
  });
});

describe('normalizeDocRef', () => {
  it.each([
    ['https://www.workflowbuilder.io/docs/guides/a/#props', 'guides/a#props'],
    ['/docs/guides/a/', 'guides/a'],
    ['/get-started/theming/', 'get-started/theming'],
    ['guides/a.mdx', 'guides/a'],
    ['guides/a.md', 'guides/a'],
    ['guides/a/', 'guides/a'],
    ['Guides/A#props', 'guides/a#props'],
    ['guides/a#props~2', 'guides/a#props'],
    ['nodes/index', 'nodes'],
    [String.raw`guides\a`, 'guides/a'],
    ['/', 'index'],
    ['http://www.workflowbuilder.io/docs/guides/a/', 'guides/a'],
    ['https://workflowbuilder.io/docs/guides/a/', 'guides/a'],
    ['/guides/a/?x=1#props', 'guides/a#props'],
    [
      'https://github.com/synergycodes/workflowbuilder/blob/main/packages/temporal/README.md?plain=1#worker',
      'readme/temporal#worker',
    ],
    [
      'https://github.com/synergycodes/workflowbuilder/blob/c1ca7580/packages/temporal/README.md#worker',
      'readme/temporal#worker',
    ],
    ['guides/a#Props-Table', 'guides/a#props-table'],
  ])('normalizes %s to %s', (input, expected) => {
    expect(normalizeDocRef(input)).toBe(expected);
  });

  it.each(['../secrets', 'guides/../../x', '//etc/passwd', 'a\0b'])('rejects %j', (input) => {
    expect(() => normalizeDocRef(input)).toThrow(InvalidDocRefError);
  });
});
