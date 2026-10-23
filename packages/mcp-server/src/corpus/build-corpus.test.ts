import { cpSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { FIXTURE_DOCS_ROOT, buildFixtureCorpus } from '../__fixtures__/fixtures.js';
import { buildCorpus } from './build-corpus.js';

const TYPEDOC_FIXTURES = path.join(FIXTURE_DOCS_ROOT, '..', 'typedoc');

describe('buildCorpus data checks', () => {
  let directory: string;
  beforeEach(() => {
    directory = mkdtempSync(path.join(tmpdir(), 'wb-docs-typedoc-'));
    cpSync(TYPEDOC_FIXTURES, directory, { recursive: true });
  });
  afterEach(() => rmSync(directory, { recursive: true, force: true }));

  const build = async (manifest?: string) => {
    const warnings: string[] = [];
    const manifestFile = path.join(directory, 'manifest.json');
    if (manifest !== undefined) writeFileSync(manifestFile, manifest);
    const corpus = await buildFixtureCorpus({
      typedocDirectory: directory,
      manifestFile,
      onWarning: (message) => warnings.push(message),
    });
    return { corpus, warnings };
  };

  it.each(['{}', '[]', 'null', '{oops'])('warns about the TypeDoc payload %s and keeps serving', async (payload) => {
    writeFileSync(path.join(directory, 'alpha.json'), payload);
    const { corpus, warnings } = await build();
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toMatch(/^TypeDoc data for alpha .*pnpm --filter mcp-server build/);
    expect(corpus.symbols.symbols.has('sdk:WidgetProps')).toBe(false);
    expect(corpus.symbols.symbols.has('ui:Button')).toBe(true);
  });

  it('warns about a corrupt referenced TypeDoc file and keeps serving', async () => {
    writeFileSync(path.join(directory, 'alpha.referenced.json'), '{"trunc');
    const { corpus, warnings } = await build();
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toMatch(/^TypeDoc data for alpha.referenced .*pnpm --filter mcp-server build/);
    expect(corpus.symbols.symbols.has('sdk:WidgetProps')).toBe(true);
  });

  it('warns when the declaration counts differ from the manifest', async () => {
    const { warnings } = await build(JSON.stringify({ packages: { sdk: 999, ui: 5, temporal: 1 } }));
    expect(
      warnings.some((warning) => warning.includes('TypeDoc data for sdk holds') && warning.includes('records 999')),
    ).toBe(true);
  });

  it('tolerates a corrupt manifest with a warning', async () => {
    const { warnings } = await build('{oops');
    expect(warnings).toEqual([expect.stringContaining('manifest')]);
  });
});

describe('buildCorpus', () => {
  it('indexes docs and symbols from the fixtures', async () => {
    const { stats, docs, symbols } = await buildFixtureCorpus();
    expect(stats.pages).toBe(docs.pages.size);
    expect(stats.chunks).toBe(docs.chunks.size);
    expect(stats.symbols).toBe(symbols.symbols.size);
    expect(stats.members).toBe(symbols.memberCount);
    expect(stats.typedocBuiltAt).toBe('unknown');
  });

  it('links ui symbols to the pages whose PropsTable names them', async () => {
    const { symbols } = await buildFixtureCorpus();
    const button = symbols.symbols.get('ui:Button');
    expect(button?.docs).toEqual(['guides/props']);
    expect(symbols.symbols.get('sdk:Engine')?.docs).toBeUndefined();
  });

  it('fails with a rebuild hint when TypeDoc data is missing', async () => {
    await expect(buildFixtureCorpus({ typedocDirectory: FIXTURE_DOCS_ROOT })).rejects.toThrow(
      /pnpm --filter mcp-server build/,
    );
  });

  it('fails when the docs root is missing', async () => {
    await expect(buildCorpus({ docsRoot: `${FIXTURE_DOCS_ROOT}-missing`, uiComponents: [] })).rejects.toThrow(
      /Docs root not found/,
    );
  });

  it('applies injected ranking and synonyms without an index rebuild path', async () => {
    const { ranking } = await import('../config/ranking.js');
    const corpus = await buildFixtureCorpus({
      synonyms: { map: { zzz: ['plain'] }, stopwords: [] },
      ranking: { docs: { ...ranking.docs }, symbols: { ...ranking.symbols } },
    });
    expect(corpus.docs.search('zzz', 3)[0].chunk.pageId).toBe('plain');
  });
});
