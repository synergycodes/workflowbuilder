import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));

// src/ and dist/ sit at the same depth, so one resolution serves tsx and the built server.
export const PACKAGE_ROOT = path.resolve(here, '..');
export const REPO_ROOT = path.resolve(PACKAGE_ROOT, '../..');
export const DOCS_ROOT = path.resolve(REPO_ROOT, 'apps/docs/src/content/docs');
export const PACKAGES_ROOT = path.resolve(REPO_ROOT, 'packages');
export const UI_COMPONENTS_FILE = path.resolve(REPO_ROOT, 'apps/docs/scripts/ui-components.mjs');
export const UI_SOURCE_ROOT = path.resolve(REPO_ROOT, 'packages/ui/src');
export const DATA_DIR = path.resolve(PACKAGE_ROOT, 'dist/data');
export const TYPEDOC_DIR = path.resolve(DATA_DIR, 'typedoc');
export const MANIFEST_FILE = path.resolve(DATA_DIR, 'manifest.json');
