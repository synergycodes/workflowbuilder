import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildCorpus } from '../corpus/build-corpus.js';
import type { BuildCorpusOptions, PackageSource } from '../corpus/build-corpus.js';
import { type LoadDocsOptions, type UiComponent, loadDocs } from '../corpus/load-docs.js';
import type { ExtractInput } from '../symbols/extract-symbols.js';
import type { TypedocReflection } from '../symbols/typedoc-types.js';

const here = path.dirname(fileURLToPath(import.meta.url));

export const FIXTURE_DOCS_ROOT = path.join(here, 'docs');
export const FIXTURE_PACKAGES_ROOT = path.join(here, 'packages');
export const FIXTURE_MALFORMED_ROOT = path.join(here, 'docs-malformed');
export const FIXTURE_DUPLICATE_ROOT = path.join(here, 'docs-duplicate');
const FIXTURE_TYPEDOC_DIRECTORY = path.join(here, 'typedoc');

export const FIXTURE_COMPONENTS: UiComponent[] = [
  { slug: 'button', name: 'Button', propsType: ['LabelButtonProps', 'IconButtonProps'] },
  { slug: 'plain', name: 'Plain', propsType: null },
];

const FIXTURE_IMPORT_PATHS = {
  alpha: 'fixture-alpha',
  beta: 'fixture-beta',
  multi: {
    multi: 'fixture-multi',
    'multi/client': 'fixture-multi/client',
    'multi/workflow': 'fixture-multi/workflow',
  },
};

// The corpus uses the real package names so tool filters accept them.
const FIXTURE_PACKAGES: PackageSource[] = [
  { name: 'sdk', typedocFile: 'alpha', importPath: FIXTURE_IMPORT_PATHS.alpha },
  { name: 'ui', typedocFile: 'beta', importPath: FIXTURE_IMPORT_PATHS.beta },
  { name: 'temporal', typedocFile: 'multi', importPath: FIXTURE_IMPORT_PATHS.multi },
];

async function readFixtureTypedoc(name: string) {
  const { readFile } = await import('node:fs/promises');
  return JSON.parse(await readFile(path.join(FIXTURE_TYPEDOC_DIRECTORY, `${name}.json`), 'utf8')) as TypedocReflection;
}

export async function fixtureExtractInput(
  name: 'alpha' | 'beta' | 'multi',
  packageName: string = name,
): Promise<ExtractInput> {
  return { packageName, project: await readFixtureTypedoc(name), importPath: FIXTURE_IMPORT_PATHS[name] };
}

export function loadFixtureDocs(overrides: Partial<LoadDocsOptions> = {}) {
  return loadDocs({ docsRoot: FIXTURE_DOCS_ROOT, packageDocs: [], uiComponents: FIXTURE_COMPONENTS, ...overrides });
}

export async function buildFixtureCorpus({
  packageDocs = [],
  ...overrides
}: Partial<BuildCorpusOptions> & Pick<LoadDocsOptions, 'packageDocs'> = {}) {
  return buildCorpus({
    docs: await loadFixtureDocs({ packageDocs, onWarning: overrides.onWarning }),
    typedocDirectory: FIXTURE_TYPEDOC_DIRECTORY,
    manifestFile: path.join(here, 'missing-manifest.json'),
    packages: FIXTURE_PACKAGES,
    ...overrides,
  });
}
