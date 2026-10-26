import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { parse as parseYaml } from 'yaml';

import { type ChunkingConfig, chunking as defaultChunking } from '../config/chunking.js';
import { chunkPage } from './chunk.js';
import { cleanDocument, splitFrontmatter } from './clean-mdx.js';
import { pageIdFromPath, pageUrl } from './doc-ids.js';
import type { DocChunk, DocPage, DocSection } from './types.js';

interface LoadPagesOptions {
  root: string;
  propsTypes: (slug: string) => readonly string[] | null | undefined;
  chunking?: ChunkingConfig;
  skipRootDirectories?: readonly string[];
  cssVariables?: (slug: string) => readonly string[] | undefined;
  // A page that cannot be loaded is skipped and reported here; the default writes to stderr.
  onWarning?: (message: string) => void;
}

interface LoadedDocs {
  pages: DocPage[];
  sections: DocSection[];
  chunks: DocChunk[];
  propsTableSlugsByPage: Map<string, string[]>;
}

interface Frontmatter {
  title?: unknown;
  description?: unknown;
  sidebar?: { badge?: unknown };
}

const DEFAULT_SKIPPED_ROOT_DIRECTORIES = ['api', 'ui-api'];

function listFiles(root: string, skippedRoot: readonly string[]) {
  const files: string[] = [];
  const walk = (directory: string, isRoot: boolean) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      if (entry.name.startsWith('_') || entry.isSymbolicLink()) continue;
      const full = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        if (isRoot && skippedRoot.includes(entry.name)) continue;
        walk(full, false);
      } else if (/\.mdx?$/.test(entry.name)) {
        files.push(full);
      }
    }
  };
  walk(root, true);
  return files
    .map((file) => ({ file, relative: path.relative(root, file).replaceAll('\\', '/') }))
    .sort((a, b) => (a.relative < b.relative ? -1 : a.relative > b.relative ? 1 : 0));
}

function titleCase(pageId: string) {
  const segment = pageId.split('/').at(-1) ?? pageId;
  return segment
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function badgeOf(frontmatter: Frontmatter) {
  const badge = frontmatter.sidebar?.badge;
  if (typeof badge === 'string') return badge;
  if (badge && typeof badge === 'object' && 'text' in badge && typeof badge.text === 'string') return badge.text;
  return;
}

function firstLine(error: unknown) {
  const text = error instanceof Error ? error.message : String(error);
  return text.split(/\r?\n/)[0] ?? text;
}

function parseFrontmatter(raw: string | undefined): Frontmatter {
  if (raw === undefined) return {};
  try {
    const parsed = parseYaml(raw) as Frontmatter | null;
    return parsed ?? {};
  } catch (error) {
    throw new Error(`malformed frontmatter (${firstLine(error)})`);
  }
}

const forward = (value: string) => value.replaceAll(String.fromCodePoint(92), '/');

function reasonOf(error: unknown, root: string, relative: string) {
  return forward(firstLine(error))
    .replaceAll(`${forward(root)}/`, '')
    .replace(`${relative}: `, '');
}

export function loadPages(options: LoadPagesOptions): LoadedDocs {
  const skipped = options.skipRootDirectories ?? DEFAULT_SKIPPED_ROOT_DIRECTORIES;
  const warn = options.onWarning ?? ((message: string) => console.error(`wb-docs: ${message}`));
  const pages: DocPage[] = [];
  const sections: DocSection[] = [];
  const chunks: DocChunk[] = [];
  const propsTableSlugsByPage = new Map<string, string[]>();
  const pageFiles = new Map<string, string>();

  for (const { file, relative } of listFiles(options.root, skipped)) {
    try {
      const pageId = pageIdFromPath(relative);
      const existing = pageFiles.get(pageId);
      if (existing) throw new Error(`maps to the same id "${pageId}" as ${existing}`);
      pageFiles.set(pageId, relative);

      const loaded = loadPage(options, file, pageId);
      pages.push(loaded.page);
      sections.push(...loaded.sections);
      chunks.push(...loaded.chunks);
      if (loaded.propsTableSlugs.length > 0) propsTableSlugsByPage.set(pageId, loaded.propsTableSlugs);
    } catch (error) {
      warn(`skipped ${relative}: ${reasonOf(error, options.root, relative)}`);
    }
  }

  return { pages, sections, chunks, propsTableSlugsByPage };
}

function loadPage(options: LoadPagesOptions, file: string, pageId: string) {
  const source = readFileSync(file, 'utf8');
  const { raw, body } = splitFrontmatter(source);
  const frontmatter = parseFrontmatter(raw);
  const extension = file.endsWith('.mdx') ? '.mdx' : '.md';
  const cleaned = cleanDocument(body, extension, {
    filePath: file,
    readPartial: (partialPath) => readFileSync(partialPath, 'utf8'),
    propsTypes: options.propsTypes,
    cssVariables: options.cssVariables,
  });

  const title = typeof frontmatter.title === 'string' ? frontmatter.title : titleCase(pageId);
  const description = typeof frontmatter.description === 'string' ? frontmatter.description : '';
  const badge = badgeOf(frontmatter);
  const markdown = cleaned.text.trim();
  const chunked = chunkPage({ pageId, title, description, badge, markdown }, options.chunking ?? defaultChunking);

  const seenSections = new Set<string>();
  for (const section of chunked.sections) {
    if (seenSections.has(section.id)) throw new Error(`duplicate section id ${section.id}`);
    seenSections.add(section.id);
  }

  const page: DocPage = {
    id: pageId,
    title,
    description,
    ...(badge ? { badge } : {}),
    url: pageUrl(pageId),
    content: markdown,
    sectionIds: chunked.sections.map((section) => section.id),
  };
  return { page, sections: chunked.sections, chunks: chunked.chunks, propsTableSlugs: cleaned.propsTableSlugs };
}
