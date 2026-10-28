import { cpSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import {
  FIXTURE_CORPUS_OPTIONS,
  FIXTURE_DOCS_ROOT,
  buildFixtureCorpus,
  loadFixtureDocs,
} from '../__fixtures__/fixtures.js';
import { DOCS_FORMAT, buildCorpus, serializeDocs } from './build-corpus.js';

const TYPEDOC_FIXTURES = path.join(FIXTURE_DOCS_ROOT, '..', 'typedoc');
const REBUILD_HINT = /pnpm --filter @workflowbuilder\/mcp build/;

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
    expect(warnings[0]).toMatch(/^TypeDoc data for alpha /);
    expect(warnings[0]).toMatch(REBUILD_HINT);
    expect(corpus.symbols.symbols.has('sdk:WidgetProps')).toBe(false);
    expect(corpus.symbols.symbols.has('ui:Button')).toBe(true);
  });

  it('warns about a corrupt referenced TypeDoc file and keeps serving', async () => {
    writeFileSync(path.join(directory, 'alpha.referenced.json'), '{"trunc');
    const { corpus, warnings } = await build();
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toMatch(/^TypeDoc data for alpha.referenced /);
    expect(warnings[0]).toMatch(REBUILD_HINT);
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

  it('reports the documented package versions from the manifest', async () => {
    const { corpus } = await build(JSON.stringify({ versions: { sdk: '3.0.0', ui: '1.0.0', temporal: '0.2.0' } }));
    expect(corpus.stats.versions).toEqual({ sdk: '3.0.0', ui: '1.0.0', temporal: '0.2.0' });
  });
});

describe('buildCorpus docs snapshot', () => {
  let directory: string;
  let docsFile: string;
  beforeEach(() => {
    directory = mkdtempSync(path.join(tmpdir(), 'wb-docs-snapshot-'));
    docsFile = path.join(directory, 'docs.json');
  });
  afterEach(() => rmSync(directory, { recursive: true, force: true }));

  const buildFromDisk = () => buildCorpus({ ...FIXTURE_CORPUS_OPTIONS, docsFile });

  it('serves a snapshot read from disk like the one loaded in memory', async () => {
    writeFileSync(docsFile, serializeDocs(await loadFixtureDocs()));
    const fromDisk = await buildFromDisk();
    const inMemory = await buildFixtureCorpus();

    expect(fromDisk.stats.pages).toBe(inMemory.stats.pages);
    expect(fromDisk.stats.chunks).toBe(inMemory.stats.chunks);
    const ids = (corpus: typeof inMemory) => corpus.docs.search('button props', 5).map((hit) => hit.chunk.chunkId);
    expect(ids(fromDisk)).toEqual(ids(inMemory));
    expect(fromDisk.symbols.symbols.get('ui:Button')?.docs).toEqual(['guides/props']);
  });

  it('fails with a rebuild hint when the docs data is missing', async () => {
    await expect(buildFromDisk()).rejects.toThrow(REBUILD_HINT);
  });

  it.each(['{oops', '{}', 'null'])('fails with a rebuild hint on the docs data %s', async (payload) => {
    writeFileSync(docsFile, payload);
    await expect(buildFromDisk()).rejects.toThrow(REBUILD_HINT);
  });

  it('refuses a snapshot written in another format', async () => {
    writeFileSync(docsFile, JSON.stringify({ ...(await loadFixtureDocs()), format: DOCS_FORMAT + 1 }));
    await expect(buildFromDisk()).rejects.toThrow(/format/);
  });

  it('refuses a snapshot with no pages instead of serving empty results', async () => {
    writeFileSync(docsFile, serializeDocs({ pages: [], sections: [], chunks: [], docsBySymbolName: {} }));
    await expect(buildFromDisk()).rejects.toThrow(/has no pages/);
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
    expect(stats.versions).toEqual({});
  });

  it('links ui symbols to the pages whose PropsTable names them', async () => {
    const { symbols } = await buildFixtureCorpus();
    const button = symbols.symbols.get('ui:Button');
    expect(button?.docs).toEqual(['guides/props']);
    expect(symbols.symbols.get('sdk:Engine')?.docs).toBeUndefined();
  });

  it('fails with a rebuild hint when TypeDoc data is missing', async () => {
    await expect(buildFixtureCorpus({ typedocDirectory: FIXTURE_DOCS_ROOT })).rejects.toThrow(REBUILD_HINT);
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
