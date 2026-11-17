import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

import type { DocsRanking, SymbolsRanking } from '../config/ranking.js';
import { type DocsData, DocsEngine } from '../docs/docs-search.js';
import { DOCS_FILE, MANIFEST_FILE, TYPEDOC_DIR } from '../paths.js';
import type { SynonymConfig } from '../search/query-terms.js';
import { type ApiSymbol, extractSymbols } from '../symbols/extract-symbols.js';
import { SymbolEngine } from '../symbols/symbol-search.js';
import { type TypedocReflection, topLevelCount } from '../symbols/typedoc-types.js';

export interface PackageSource {
  name: string;
  typedocFile?: string;
  importPath: string | Record<string, string>;
}

export const PACKAGES: readonly PackageSource[] = [
  { name: 'sdk', importPath: '@workflowbuilder/sdk' },
  { name: 'ui', importPath: '@workflowbuilder/ui' },
  {
    name: 'temporal',
    importPath: {
      index: '@workflowbuilder/temporal',
      client: '@workflowbuilder/temporal/client',
      workflow: '@workflowbuilder/temporal/workflow',
    },
  },
];

// The docs as the build writes them to dist/data/docs.json: cleaned and chunked, ready to index.
export interface DocsSnapshot extends DocsData {
  // UI symbol name -> the pages whose PropsTable documents it.
  docsBySymbolName: Record<string, string[]>;
  // The commit GitHub links in the snapshot point at.
  revision?: string;
}

// Bump when the shape of DocPage, DocSection or DocChunk changes, so a server never reads an older snapshot.
export const DOCS_FORMAT = 1;

export function serializeDocs(snapshot: DocsSnapshot) {
  return JSON.stringify({ format: DOCS_FORMAT, ...snapshot });
}

export interface BuildCorpusOptions {
  docs?: DocsSnapshot;
  docsFile?: string;
  typedocDirectory?: string;
  manifestFile?: string;
  packages?: readonly PackageSource[];
  ranking?: { docs: DocsRanking; symbols: SymbolsRanking };
  synonyms?: SynonymConfig;
  // Non-fatal problems (inconsistent TypeDoc data); the default writes to stderr.
  onWarning?: (message: string) => void;
}

interface CorpusStats {
  pages: number;
  chunks: number;
  symbols: number;
  members: number;
  typedocBuiltAt: string;
  gitHead: string;
  docsRevision?: string;
  // Versions of the documented packages at build time, e.g. { sdk: '3.0.0' }.
  versions: Record<string, string>;
  buildMs: number;
}

export interface Corpus {
  docs: DocsEngine;
  symbols: SymbolEngine;
  stats: CorpusStats;
}

const REBUILD_HINT =
  'reinstall @workflowbuilder/mcp (in the workflowbuilder repo: run `pnpm --filter @workflowbuilder/mcp build`)';
const EMPTY_PROJECT: TypedocReflection = { id: 0, name: '', kind: 1, children: [] };

function readDocs(file: string): DocsSnapshot {
  if (!existsSync(file)) throw new Error(`Missing docs data ${file}; ${REBUILD_HINT}`);
  let parsed: (Partial<DocsSnapshot> & { format?: unknown }) | null;
  try {
    parsed = JSON.parse(readFileSync(file, 'utf8'));
  } catch (error) {
    throw new Error(
      `Docs data ${file} is not valid JSON (${error instanceof Error ? error.message : error}); ${REBUILD_HINT}`,
    );
  }
  if (parsed?.format !== DOCS_FORMAT) {
    throw new Error(
      `Docs data ${file} is format ${String(parsed?.format)}, this server reads ${DOCS_FORMAT}; ${REBUILD_HINT}`,
    );
  }
  if (
    !Array.isArray(parsed.pages) ||
    parsed.pages.length === 0 ||
    !Array.isArray(parsed.sections) ||
    !Array.isArray(parsed.chunks)
  ) {
    throw new Error(`Docs data ${file} has no pages; ${REBUILD_HINT}`);
  }
  return {
    pages: parsed.pages,
    sections: parsed.sections,
    chunks: parsed.chunks,
    docsBySymbolName: parsed.docsBySymbolName ?? {},
    revision: parsed.revision,
  };
}

function readTypedoc(directory: string, name: string, warn: (message: string) => void): TypedocReflection {
  const file = path.join(directory, `${name}.json`);
  if (!existsSync(file)) throw new Error(`Missing TypeDoc data ${file}; ${REBUILD_HINT}`);
  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(file, 'utf8'));
  } catch (error) {
    warn(
      `TypeDoc data for ${name} is not valid JSON (${error instanceof Error ? error.message : error}); ${REBUILD_HINT}`,
    );
    return EMPTY_PROJECT;
  }
  if (typeof parsed !== 'object' || parsed === null || !Array.isArray((parsed as TypedocReflection).children)) {
    warn(`TypeDoc data for ${name} has no declarations; ${REBUILD_HINT}`);
    return EMPTY_PROJECT;
  }
  return parsed as TypedocReflection;
}

function readReferencedTypedoc(directory: string, name: string, warn: (message: string) => void) {
  const file = path.join(directory, `${name}.referenced.json`);
  return existsSync(file) ? readTypedoc(directory, `${name}.referenced`, warn) : undefined;
}

interface Manifest {
  builtAt?: string;
  gitHead?: string;
  packages?: Record<string, number>;
  versions?: Record<string, string>;
}

function readManifest(file: string, warn: (message: string) => void) {
  const unknown = {
    builtAt: 'unknown',
    gitHead: 'unknown',
    packages: {} as Record<string, number>,
    versions: {} as Record<string, string>,
  };
  if (!existsSync(file)) return unknown;
  try {
    const manifest = JSON.parse(readFileSync(file, 'utf8')) as Manifest;
    return {
      builtAt: manifest.builtAt ?? 'unknown',
      gitHead: manifest.gitHead ?? 'unknown',
      packages: manifest.packages ?? {},
      versions: manifest.versions ?? {},
    };
  } catch {
    warn(`TypeDoc manifest ${file} is not valid JSON; ${REBUILD_HINT}`);
    return unknown;
  }
}

export async function buildCorpus(options: BuildCorpusOptions = {}): Promise<Corpus> {
  const started = performance.now();
  const warn = options.onWarning ?? ((message: string) => console.error(`wb-docs: ${message}`));
  const docsData = options.docs ?? readDocs(options.docsFile ?? DOCS_FILE);
  const docsBySymbolName = new Map(Object.entries(docsData.docsBySymbolName));

  const typedocDirectory = options.typedocDirectory ?? TYPEDOC_DIR;
  const manifest = readManifest(options.manifestFile ?? MANIFEST_FILE, warn);
  const symbols: ApiSymbol[] = [];
  for (const source of options.packages ?? PACKAGES) {
    const file = source.typedocFile ?? source.name;
    const project = readTypedoc(typedocDirectory, file, warn);
    const expected = manifest.packages[source.name];
    const actual = topLevelCount(project, typeof source.importPath !== 'string');
    if (expected !== undefined && project !== EMPTY_PROJECT && expected !== actual) {
      warn(
        `TypeDoc data for ${source.name} holds ${actual} declarations but the manifest records ${expected}; ${REBUILD_HINT}`,
      );
    }
    symbols.push(
      ...extractSymbols(
        {
          packageName: source.name,
          project,
          importPath: source.importPath,
          referenced: readReferencedTypedoc(typedocDirectory, file, warn),
        },
        { docsBySymbolName: source.name === 'ui' ? docsBySymbolName : undefined },
      ),
    );
  }

  const docs = new DocsEngine(docsData, { ranking: options.ranking?.docs, synonyms: options.synonyms });
  const symbolEngine = new SymbolEngine(symbols, { ranking: options.ranking?.symbols, synonyms: options.synonyms });

  return {
    docs,
    symbols: symbolEngine,
    stats: {
      pages: docs.pages.size,
      chunks: docs.chunks.size,
      symbols: symbolEngine.symbols.size,
      members: symbolEngine.memberCount,
      typedocBuiltAt: manifest.builtAt,
      gitHead: manifest.gitHead,
      docsRevision: docsData.revision,
      versions: manifest.versions,
      buildMs: Math.round(performance.now() - started),
    },
  };
}
