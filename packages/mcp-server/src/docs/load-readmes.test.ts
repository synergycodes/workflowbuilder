import { mkdirSync, mkdtempSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { FIXTURE_PACKAGES_ROOT, buildFixtureCorpus } from '../__fixtures__/fixtures.js';
import { normalizeDocRef } from './doc-ids.js';
import { loadReadmes, rewriteRelativeLinks } from './load-readmes.js';

const sources = [
  { name: 'sdk', root: path.join(FIXTURE_PACKAGES_ROOT, 'sdk'), title: '@workflowbuilder/sdk' },
  { name: 'ui', root: path.join(FIXTURE_PACKAGES_ROOT, 'ui'), title: '@workflowbuilder/ui' },
];
const BLOB = 'https://github.com/synergycodes/workflowbuilder/blob/main';

describe('loadReadmes', () => {
  const loaded = loadReadmes({ sources });

  it('indexes README and the other shipped markdown files, not the changelog or unshipped files', () => {
    expect(loaded.pages.map((page) => page.id)).toEqual(['readme/sdk', 'readme/ui', 'readme/ui/css-layers']);
  });

  it('takes the title from the H1, else the npm name', () => {
    const titles = Object.fromEntries(loaded.pages.map((page) => [page.id, page.title]));
    expect(titles['readme/sdk']).toBe('Fixture SDK');
    expect(titles['readme/ui']).toBe('@workflowbuilder/ui');
  });

  it('builds section ids and GitHub urls with the docs anchor scheme', () => {
    const base = `${BLOB}/packages/sdk/README.md`;
    expect(loaded.pages[0].url).toBe(base);
    expect(loaded.pages[0].sectionIds).toEqual([
      'readme/sdk#_intro',
      'readme/sdk#install',
      'readme/sdk#worker-zebrafruit-setup',
    ]);
    const chunk = loaded.chunks.find((candidate) => candidate.sectionId === 'readme/sdk#install');
    expect(chunk?.url).toBe(`${base}#install`);
    expect(loaded.chunks.find((candidate) => candidate.sectionId === 'readme/sdk#_intro')?.url).toBe(base);
  });

  it('resolves relative links to GitHub and leaves absolute and fenced links alone', () => {
    const content = loaded.pages[0].content;
    expect(content).toContain('(https://www.workflowbuilder.io/docs/guides/x/)');
    expect(content).toContain(`(${BLOB}/packages/sdk/CHANGELOG.md#v1)`);
    expect(content).toContain(`(${BLOB}/packages/ui/README.md)`);
    expect(content).toContain('(https://github.com/synergycodes/workflowbuilder/tree/main/apps/demo)');
    expect(content).toContain('[kept as is](./inside-fence.md)');
  });

  it('points every GitHub url at the given revision', () => {
    const pinned = loadReadmes({ sources, revision: 'abc123' });
    const sdk = pinned.pages[0];
    expect(sdk.url).toBe('https://github.com/synergycodes/workflowbuilder/blob/abc123/packages/sdk/README.md');
    expect(sdk.content).toContain(
      '(https://github.com/synergycodes/workflowbuilder/blob/abc123/packages/ui/README.md)',
    );
    expect(sdk.content).not.toContain('/main/');
    expect(normalizeDocRef(`${sdk.url}#install`)).toBe('readme/sdk#install');
  });

  it('warns and continues when a package has no manifest', () => {
    const warnings: string[] = [];
    const result = loadReadmes({
      sources: [{ name: 'gone', root: path.join(FIXTURE_PACKAGES_ROOT, 'gone'), title: 'gone' }, ...sources],
      onWarning: (message) => warnings.push(message),
    });
    expect(warnings).toHaveLength(1);
    expect(result.pages).toHaveLength(3);
  });
});

function packageWith(files: Record<string, string>, listed: string[]) {
  const root = mkdtempSync(path.join(tmpdir(), 'wb-readmes-'));
  writeFileSync(path.join(root, 'package.json'), JSON.stringify({ files: listed }));
  for (const [name, content] of Object.entries(files)) writeFileSync(path.join(root, name), content);
  return { name: 'pkg', root, title: 'npm-name' };
}

describe('loadReadmes robustness', () => {
  it('takes the first heading outside code fences and keeps a trailing #', () => {
    const source = packageWith({ 'README.md': '```sh\n# comment\n```\n\n# Using C#\n' }, []);
    expect(loadReadmes({ sources: [source] }).pages[0].title).toBe('Using C#');
    const closed = packageWith({ 'README.md': '# Closed ##\n' }, []);
    expect(loadReadmes({ sources: [closed] }).pages[0].title).toBe('Closed');
  });

  it('indexes one page per readme id and skips a file that cannot be read', () => {
    const source = packageWith({ 'README.md': '# One\n', 'notes.md': '# Notes\n' }, [
      'readme.md',
      'notes.md',
      'gone.md',
    ]);
    unlinkSync(path.join(source.root, 'notes.md'));
    mkdirSync(path.join(source.root, 'gone.md'));
    const warnings: string[] = [];
    const loaded = loadReadmes({ sources: [source], onWarning: (message) => warnings.push(message) });
    expect(loaded.pages.map((page) => page.id)).toEqual(['readme/pkg']);
    expect(warnings.some((message) => message.includes('gone.md'))).toBe(true);
  });
});

describe('rewriteRelativeLinks', () => {
  it('keeps same-page anchors and links that leave the repo', () => {
    expect(rewriteRelativeLinks('[a](#x) [b](../../../x.md)', 'sdk', 'README.md', 'main')).toBe(
      '[a](#x) [b](../../../x.md)',
    );
  });
});

describe('README ids in the corpus', () => {
  it('searches README sections and keeps the fixture docs apart', async () => {
    const corpus = await buildFixtureCorpus({ packageDocs: sources });
    expect(corpus.docs.search('zebrafruit', 3)[0].chunk.sectionId).toBe('readme/sdk#worker-zebrafruit-setup');
    expect(corpus.docs.pages.has('readme/ui/css-layers')).toBe(true);
    expect(corpus.docs.pages.has('plain')).toBe(true);
  });

  it.each([
    [`${BLOB}/packages/sdk/README.md#Install`, 'readme/sdk#install'],
    [`${BLOB}/packages/ui/css-layers.md`, 'readme/ui/css-layers'],
    ['readme/sdk', 'readme/sdk'],
  ])('normalizes %s', (input, expected) => {
    expect(normalizeDocRef(input)).toBe(expected);
  });
});
