import { existsSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import type { ChunkingConfig } from '../config/chunking.js';
import { readCssVariables } from '../docs/css-variables.js';
import { loadPages } from '../docs/load-pages.js';
import { type PackageDocsSource, loadReadmes } from '../docs/load-readmes.js';
import { DOCS_ROOT, PACKAGES_ROOT, UI_COMPONENTS_FILE, UI_SOURCE_ROOT } from '../paths.js';
import { type DocsSnapshot, PACKAGES } from './build-corpus.js';

export interface UiComponent {
  slug: string;
  name: string;
  propsType: string | readonly string[] | null;
  // Folder under packages/ui/src/components that holds the component's stylesheets.
  dir?: string | null;
  cssSources?: readonly string[];
}

export interface LoadDocsOptions {
  docsRoot?: string;
  // Packages whose shipped markdown is indexed; defaults to the published packages under packages/.
  packageDocs?: readonly PackageDocsSource[];
  uiComponents?: readonly UiComponent[];
  uiComponentsFile?: string;
  uiSourceRoot?: string;
  chunking?: ChunkingConfig;
  skipRootDirectories?: readonly string[];
  // Branch or commit that links into the repo point at; the build passes the commit it snapshots.
  revision?: string;
  // A page that cannot be loaded is skipped and reported here; the default writes to stderr.
  onWarning?: (message: string) => void;
}

function defaultPackageDocs(): PackageDocsSource[] {
  return PACKAGES.map((source) => ({
    name: source.name,
    root: path.join(PACKAGES_ROOT, source.name),
    title: `@workflowbuilder/${source.name}`,
  }));
}

async function loadUiComponents(file: string) {
  if (!existsSync(file)) throw new Error(`Missing ${file}`);
  const module_ = (await import(pathToFileURL(file).href)) as { COMPONENTS: readonly UiComponent[] };
  return module_.COMPONENTS;
}

function propsTypesOf(component: UiComponent) {
  if (component.propsType === null) return [];
  return typeof component.propsType === 'string' ? [component.propsType] : [...component.propsType];
}

// Build time only: the MDX parsers behind it are devDependencies, and the published server starts from the snapshot.
export async function loadDocs(options: LoadDocsOptions = {}): Promise<DocsSnapshot> {
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
    revision: options.revision,
    cssVariables: (slug) => {
      const component = bySlug.get(slug);
      return component ? readCssVariables(uiSourceRoot, component, components) : undefined;
    },
  });

  const readmes = loadReadmes({
    sources: options.packageDocs ?? defaultPackageDocs(),
    chunking: options.chunking,
    revision: options.revision,
    onWarning: warn,
  });

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

  return {
    pages: [...loaded.pages, ...readmes.pages],
    sections: [...loaded.sections, ...readmes.sections],
    chunks: [...loaded.chunks, ...readmes.chunks],
    docsBySymbolName: Object.fromEntries(docsBySymbolName),
    revision: options.revision,
  };
}
