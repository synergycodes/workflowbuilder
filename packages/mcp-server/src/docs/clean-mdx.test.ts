import { readFileSync } from 'node:fs';
import path from 'node:path';

import { FIXTURE_DOCS_ROOT } from '../__fixtures__/fixtures.js';
import { cleanDocument, splitFrontmatter } from './clean-mdx.js';

const FILE = path.join(FIXTURE_DOCS_ROOT, 'guides/inline.mdx');

const propsTypes = (slug: string) => {
  if (slug === 'button') return ['LabelButtonProps', 'IconButtonProps'];
  if (slug === 'plain') return null;
  return;
};

function clean(source: string, readPartial: (file: string) => string = () => '') {
  return cleanDocument(source, '.mdx', { filePath: FILE, readPartial, propsTypes });
}

const readPackageJson = (file: string) => (file.endsWith('package.json') ? '{"engines":{"node":"22.1.0"}}' : '');

describe('splitFrontmatter', () => {
  it('separates the yaml block from the body', () => {
    expect(splitFrontmatter('---\ntitle: A\n---\nBody\n')).toEqual({ raw: 'title: A', body: 'Body\n' });
  });

  it('returns the whole source when there is no frontmatter', () => {
    expect(splitFrontmatter('Body')).toEqual({ raw: undefined, body: 'Body' });
  });
});

describe('mdx cleaning rules', () => {
  it('removes import and export lines anywhere in the file', () => {
    const { text } = clean("import A from './a';\n\nText one.\n\nimport B from './b';\n\nText two.\n");
    expect(text.trim()).toBe('Text one.\n\n\nText two.');
  });

  it('keeps an unresolvable expression as written and drops jsx comments', () => {
    expect(clean('A {value} b. {/* note */}\n').text).toBe('A {value} b. \n');
  });

  it('resolves expressions on an imported json file', () => {
    const source = "import pkg from './package.json';\n\nNode <code>{pkg.engines.node}</code>, {pkg.engines.nope}.\n";
    expect(clean(source, readPackageJson).text.trim()).toBe('Node 22.1.0, {pkg.engines.nope}.');
  });

  it('keeps the target of a link', () => {
    expect(clean('See <a href="https://x.test/a" target="_blank">the docs</a> now.\n').text).toBe(
      'See the docs (https://x.test/a) now.\n',
    );
    expect(clean('See <a href={URL}>the docs</a>.\n').text).toBe('See the docs.\n');
  });

  it('keeps the docs url of an OverflowCard', () => {
    expect(clean('<OverflowCard docsUrl="https://overflow.test/p" />\n').text).toContain(
      'Premium plugin docs (https://overflow.test/p)',
    );
  });

  it('renders css variables from the injected lookup', () => {
    const { text } = cleanDocument('<CssVariablesTable slug="button" />\n', '.mdx', {
      filePath: FILE,
      readPartial: () => '',
      propsTypes,
      cssVariables: (slug) => (slug === 'button' ? ['--wb-public-a', '--wb-public-b'] : undefined),
    });
    expect(text.trim()).toBe('CSS variables you can override (each name starts with --wb-public-): a, b');
  });

  it('unwraps Tabs and labels TabItem', () => {
    const { text } = clean('<Tabs>\n  <TabItem label="npm">\n\nrun npm\n\n  </TabItem>\n</Tabs>\n');
    expect(text).toContain('**npm:**');
    expect(text).toContain('run npm');
    expect(text).not.toContain('<Tab');
  });

  it('replaces NodeDocumentation with a GitHub link to the demo source', () => {
    expect(clean('<NodeDocumentation node="action" />\n').text.trim()).toBe(
      'Node definition source: https://github.com/synergycodes/workflowbuilder/tree/main/apps/demo/src/app/data/nodes/action/ (schema.ts, uischema.ts)',
    );
  });

  it('replaces EnterpriseNote', () => {
    expect(clean('<EnterpriseNote />\n').text.trim()).toBe('> Enterprise: available with the Enterprise license.');
  });

  it('replaces PropsTable with pointers to the prop types', () => {
    const result = clean('<PropsTable slug="button" />\n');
    expect(result.text.trim()).toBe('Props: see get_symbol ui:LabelButtonProps, ui:IconButtonProps');
    expect(result.propsTableSlugs).toEqual(['button']);
  });

  it('drops a PropsTable whose component has no props type', () => {
    expect(clean('Before\n\n<PropsTable slug="plain" />\n\nAfter\n').text).not.toContain('Props:');
  });

  it('throws on an unknown PropsTable slug', () => {
    expect(() => clean('<PropsTable slug="missing" />\n')).toThrow(/missing/);
  });

  it('drops CssVariablesTable without data', () => {
    expect(clean('Before\n\n<CssVariablesTable slug="button" />\n\nAfter\n').text).not.toContain('Css');
  });

  it('replaces images with their alt text', () => {
    expect(clean('![diagram](./a.png)\n').text.trim()).toBe('[image: diagram]');
    expect(clean('<Image src={x} alt="photo" />\n').text.trim()).toBe('[image: photo]');
  });

  it('replaces videos with their title and drops untitled ones', () => {
    expect(clean('<VideoCard title="Intro" url="u" />\n').text.trim()).toBe('[video: Intro]');
    expect(clean('<YoutubeEmbed title="Clip" videoId="x" />\n').text.trim()).toBe('[video: Clip]');
    expect(clean('A\n\n<YoutubeEmbed videoId="x" />\n\nB\n').text).not.toContain('video');
  });

  it('inlines imported mdx partials', () => {
    const { text } = clean("import Note from './_note.mdx';\n\n<Note />\n", () => '<Aside>Partial **note**.</Aside>\n');
    expect(text.trim()).toBe('Partial **note**.');
  });

  it('unwraps unknown components that have content and drops empty ones', () => {
    const { text } = clean('<Aside type="note">Keep **this**.</Aside>\n\n<Embed client:visible />\n');
    expect(text.trim()).toBe('Keep **this**.');
  });

  it('leaves fenced and inline code byte-for-byte', () => {
    const source = 'Use `<Tabs>{x}` here.\n\n```tsx\n<Tabs>\n  <TabItem label="a">{value}</TabItem>\n</Tabs>\n```\n';
    expect(clean(source).text).toBe(source);
  });

  it('leaves text outside edits unchanged', () => {
    const source = '| a | b |\n| - | - |\n| 1 | 2 |\n\n- item\n- item\n';
    expect(clean(source).text).toBe(source);
  });

  it('collapses three or more blank lines outside code only', () => {
    const { text } = clean('a\n\n\n\n\nb\n\n```\nx\n\n\n\ny\n```\n');
    expect(text).toBe('a\n\n\nb\n\n```\nx\n\n\n\ny\n```\n');
  });

  it('honours injected component rules', () => {
    const { text } = cleanDocument('<Callout>x</Callout>\n', '.mdx', {
      filePath: FILE,
      readPartial: () => '',
      propsTypes,
      components: { Callout: { action: 'replace', template: '[callout]' } },
    });
    expect(text.trim()).toBe('[callout]');
  });
});

describe('markdown files', () => {
  it('keeps literal html and braces and removes html comments', () => {
    const source = readFileSync(path.join(FIXTURE_DOCS_ROOT, 'plain.md'), 'utf8');
    const { text } = cleanDocument(splitFrontmatter(source).body, '.md', {
      filePath: FILE,
      readPartial: () => '',
      propsTypes,
    });
    expect(text).toContain('<div>tag</div>');
    expect(text).toContain('{braces}');
    expect(text).not.toContain('hidden comment');
  });
});
