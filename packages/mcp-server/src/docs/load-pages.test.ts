import {
  FIXTURE_COMPONENTS,
  FIXTURE_DOCS_ROOT,
  FIXTURE_DUPLICATE_ROOT,
  FIXTURE_MALFORMED_ROOT,
} from '../__fixtures__/fixtures.js';
import { loadPages, resolveRelativeLinks } from './load-pages.js';

const propsTypes = (slug: string) => {
  const component = FIXTURE_COMPONENTS.find((candidate) => candidate.slug === slug);
  if (!component) return;
  if (component.propsType === null) return [];
  return typeof component.propsType === 'string' ? [component.propsType] : [...component.propsType];
};

describe('loadPages', () => {
  const loaded = loadPages({ root: FIXTURE_DOCS_ROOT, propsTypes });

  it('lists pages in sorted path order and skips api, ui-api and underscore files', () => {
    expect(loaded.pages.map((page) => page.id)).toEqual([
      'guides/basic',
      'guides/long',
      'guides/props',
      'nodes',
      'plain',
      'untitled-page',
    ]);
  });

  it('reads frontmatter with a badge and falls back to a title-cased id', () => {
    const basic = loaded.pages.find((page) => page.id === 'guides/basic');
    expect(basic).toMatchObject({
      title: 'Basic guide',
      badge: 'Enterprise',
      description: 'A guide that uses many components.',
    });
    expect(loaded.pages.find((page) => page.id === 'untitled-page')?.title).toBe('Untitled Page');
  });

  it('maps a folder index to the folder id', () => {
    expect(loaded.pages.find((page) => page.id === 'nodes')?.url).toBe('https://www.workflowbuilder.io/docs/nodes/');
  });

  it('records PropsTable slugs per page', () => {
    expect(loaded.propsTableSlugsByPage.get('guides/props')).toEqual(['button', 'plain']);
  });

  it('cleans mdx and chunks every page', () => {
    const basic = loaded.pages.find((page) => page.id === 'guides/basic');
    expect(basic?.content).not.toContain('import ');
    expect(basic?.content).toContain('[image: diagram of nodes]');
    expect(loaded.chunks.some((item) => item.pageId === 'guides/basic')).toBe(true);
    expect(basic?.sectionIds).toContain('guides/basic#duplicate');
  });

  it('keeps jsx inside code fences and inline code', () => {
    const basic = loaded.pages.find((page) => page.id === 'guides/basic');
    expect(basic?.content).toContain('`<Tabs>`');
    expect(basic?.content).toContain('<TabItem label="kept">{value}</TabItem>');
  });

  it('inlines the partial and the node documentation line', () => {
    const props = loaded.pages.find((page) => page.id === 'guides/props');
    expect(props?.content).toContain('Partial **note** about paths.');
    expect(props?.content).toContain(
      'Node definition source: https://github.com/synergycodes/workflowbuilder/tree/main/apps/demo/src/app/data/nodes/action/',
    );
    expect(props?.content).toContain('Props: see get_symbol ui:LabelButtonProps, ui:IconButtonProps');
  });

  it('is deterministic', () => {
    const again = loadPages({ root: FIXTURE_DOCS_ROOT, propsTypes });
    expect(again.chunks.map((item) => item.chunkId)).toEqual(loaded.chunks.map((item) => item.chunkId));
  });

  it('skips each broken page with one warning that names the file and the reason', () => {
    const warnings: string[] = [];
    const result = loadPages({
      root: FIXTURE_MALFORMED_ROOT,
      propsTypes,
      onWarning: (message) => warnings.push(message),
    });
    expect(result.pages.map((page) => page.id)).toEqual(['good']);
    expect(warnings.map((warning) => warning.split(':')[0])).toEqual([
      'skipped bad.md',
      'skipped missing-partial.mdx',
      'skipped stray-brace.mdx',
      'skipped unclosed.mdx',
      'skipped unknown-slug.mdx',
    ]);
    expect(warnings[0]).toContain('malformed frontmatter');
    expect(warnings[4]).toContain('slug="nope"> is not in COMPONENTS');
    for (const warning of warnings) {
      expect(warning).not.toContain('\n');
      expect(warning).not.toContain('docs-malformed');
    }
  });

  it('keeps the first file when two files map to the same page id', () => {
    const warnings: string[] = [];
    const result = loadPages({
      root: FIXTURE_DUPLICATE_ROOT,
      propsTypes,
      onWarning: (message) => warnings.push(message),
    });
    expect(result.pages.map((page) => page.id)).toEqual(['foo']);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toMatch(/^skipped foo\/index\.md: .*"foo".* foo\.md/);
  });

  it('writes skipped pages to stderr by default', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    loadPages({ root: FIXTURE_DUPLICATE_ROOT, propsTypes });
    expect(spy).toHaveBeenCalledWith(expect.stringMatching(/^wb-docs: skipped foo\/index\.md/));
    spy.mockRestore();
  });

  it('renders the css variables of a documented component', () => {
    const loaded = loadPages({
      root: FIXTURE_DOCS_ROOT,
      propsTypes,
      cssVariables: (slug) =>
        slug === 'button' ? ['--wb-public-button-color', '--wb-public-button-gap (spacing)'] : undefined,
    });
    expect(loaded.pages.find((page) => page.id === 'guides/basic')?.content).toContain(
      'CSS variables you can override (each name starts with --wb-public-): button-color, button-gap (spacing)',
    );
  });
});

describe('resolveRelativeLinks', () => {
  it('turns links relative to the page into site paths', () => {
    expect(resolveRelativeLinks('| [Trigger](./trigger/) | x |', 'nodes')).toBe('| [Trigger](/nodes/trigger/) | x |');
    expect(resolveRelativeLinks('[Up](../theming/#tokens)', 'get-started/persistence')).toBe(
      '[Up](/get-started/theming/#tokens)',
    );
    expect(resolveRelativeLinks('[Home](./guides/)', 'index')).toBe('[Home](/guides/)');
  });

  it('leaves absolute links, images and fenced code alone', () => {
    const markdown = '[a](/guides/a/) [b](https://x.dev) ![i](./i.png)\n```\n[c](./c/)\n```';
    expect(resolveRelativeLinks(markdown, 'nodes')).toBe(markdown);
  });
});
