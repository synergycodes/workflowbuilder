import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import type { ChunkingConfig } from '../config/chunking.js';
import type { DocsRanking, SymbolsRanking } from '../config/ranking.js';
import { readCssVariables } from '../docs/css-variables.js';
import { DocsEngine } from '../docs/docs-search.js';
import { loadPages } from '../docs/load-pages.js';
import { type PackageDocsSource, loadReadmes } from '../docs/load-readmes.js';
import { DOCS_ROOT, MANIFEST_FILE, PACKAGES_ROOT, TYPEDOC_DIR, UI_COMPONENTS_FILE, UI_SOURCE_ROOT } from '../paths.js';
import type { SynonymConfig } from '../search/query-terms.js';
import { type ApiSymbol, extractSymbols } from '../symbols/extract-symbols.js';
import { SymbolEngine } from '../symbols/symbol-search.js';
import { type TypedocReflection, topLevelCount } from '../symbols/typedoc-types.js';

export interface PackageSource {
  name: string;
  typedocFile?: string;
  importPath: string | Record<string, string>;
}

export interface UiComponent {
  slug: string;
  name: string;
  propsType: string | readonly string[] | null;
  // Folder under packages/ui/src/components that holds the component's stylesheets.
  dir?: string | null;
  cssSources?: readonly string[];
}

const PACKAGES: readonly PackageSource[] = [
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

function defaultPackageDocs(): PackageDocsSource[] {
  return PACKAGES.map((source) => ({
    name: source.name,
    root: path.join(PACKAGES_ROOT, source.name),
    title: `@workflowbuilder/${source.name}`,
  }));
}

export interface BuildCorpusOptions {
  docsRoot?: string;
  // Packages whose shipped markdown is indexed; defaults to the published packages under packages/.
  packageDocs?: readonly PackageDocsSource[];
  typedocDirectory?: string;
  manifestFile?: string;
  packages?: readonly PackageSource[];
  uiComponents?: readonly UiComponent[];
  uiComponentsFile?: string;
  ranking?: { docs: DocsRanking; symbols: SymbolsRanking };
  synonyms?: SynonymConfig;
  chunking?: ChunkingConfig;
  skipRootDirectories?: readonly string[];
  uiSourceRoot?: string;
  // Non-fatal problems (a skipped page, inconsistent TypeDoc data); the default writes to stderr.
  onWarning?: (message: string) => void;
}

interface CorpusStats {
  pages: number;
  chunks: number;
  symbols: number;
  members: number;
  typedocBuiltAt: string;
  gitHead: string;
  buildMs: number;
}

export interface Corpus {
  docs: DocsEngine;
  symbols: SymbolEngine;
  stats: CorpusStats;
}

const REBUILD_HINT = 'run `pnpm --filter mcp-server build`';
const EMPTY_PROJECT: TypedocReflection = { id: 0, name: '', kind: 1, children: [] };

async function loadUiComponents(file: string) {
  if (!existsSync(file)) throw new Error(`Missing ${file}`);
  const module_ = (await import(pathToFileURL(file).href)) as { COMPONENTS: readonly UiComponent[] };
  return module_.COMPONENTS;
}

function propsTypesOf(component: UiComponent) {
  if (component.propsType === null) return [];
  return typeof component.propsType === 'string' ? [component.propsType] : [...component.propsType];
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
}

function readManifest(file: string, warn: (message: string) => void) {
  const unknown = { builtAt: 'unknown', gitHead: 'unknown', packages: {} as Record<string, number> };
  if (!existsSync(file)) return unknown;
  try {
    const manifest = JSON.parse(readFileSync(file, 'utf8')) as Manifest;
    return {
      builtAt: manifest.builtAt ?? 'unknown',
      gitHead: manifest.gitHead ?? 'unknown',
      packages: manifest.packages ?? {},
    };
  } catch {
    warn(`TypeDoc manifest ${file} is not valid JSON; ${REBUILD_HINT}`);
    return unknown;
  }
}

export async function buildCorpus(options: BuildCorpusOptions = {}): Promise<Corpus> {
  const started = performance.now();
  const warn = options.onWarning ?? ((message: string) => console.error(`wb-docs: ${message}`));
  const docsRoot = options.docsRoot ?? DOCS_ROOT;
  if (!existsSync(docsRoot)) throw new Error(`Docs root not found: ${docsRoot}`);

  const components = options.uiComponents ?? (await loadUiComponents(options.uiComponentsFile ?? UI_COMPONENTS_FILE));
  const bySlug = new Map(components.map((component) => [component.slug, component]));
  const uiSourceRoot = options.uiSourceRoot ?? UI_SOURCE_ROOT;

  const loaded = loadPages({
    root: docsRoot,
    propsTypes: (slug) => {
      const component = bySlug.get(slug);
      return component ? propsTypesOf(component) : undefined;
    },
    chunking: options.chunking,
    skipRootDirectories: options.skipRootDirectories,
    onWarning: warn,
    cssVariables: (slug) => {
      const component = bySlug.get(slug);
      return component ? readCssVariables(uiSourceRoot, component, components) : undefined;
    },
  });

  const readmes = loadReadmes({
    sources: options.packageDocs ?? defaultPackageDocs(),
    chunking: options.chunking,
    onWarning: warn,
  });
  loaded.pages.push(...readmes.pages);
  loaded.sections.push(...readmes.sections);
  loaded.chunks.push(...readmes.chunks);

  const docsBySymbolName = new Map<string, string[]>();
  for (const [pageId, slugs] of loaded.propsTableSlugsByPage) {
    for (const slug of slugs) {
      const component = bySlug.get(slug);
      if (!component) continue;
      for (const name of [component.name, ...propsTypesOf(component)]) {
        const pages = docsBySymbolName.get(name) ?? [];
        if (!pages.includes(pageId)) pages.push(pageId);
        docsBySymbolName.set(name, pages);
      }
    }
  }

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

  const docs = new DocsEngine(loaded, { ranking: options.ranking?.docs, synonyms: options.synonyms });
  const symbolEngine = new SymbolEngine(symbols, { ranking: options.ranking?.symbols, synonyms: options.synonyms });

  return {
    docs,
    symbols: symbolEngine,
    stats: {
      pages: loaded.pages.length,
      chunks: loaded.chunks.length,
      symbols: symbolEngine.symbols.size,
      members: symbolEngine.memberCount,
      typedocBuiltAt: manifest.builtAt,
      gitHead: manifest.gitHead,
      buildMs: Math.round(performance.now() - started),
    },
  };
}
