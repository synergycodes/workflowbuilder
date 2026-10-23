import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { type ChunkingConfig, chunking as defaultChunking } from '../config/chunking.js';
import { chunkPage } from './chunk.js';
import { INTRO_ANCHOR, githubUrl, readmeId, readmeUrl } from './doc-ids.js';
import { FENCE, mapOutsideFences } from './fences.js';
import type { DocChunk, DocPage, DocSection } from './types.js';

export interface PackageDocsSource {
  // Directory name under packages/, also the id segment.
  name: string;
  // The package directory on disk.
  root: string;
  // npm name, the page title when the file has no H1.
  title: string;
}

interface LoadReadmesOptions {
  sources: readonly PackageDocsSource[];
  chunking?: ChunkingConfig;
  revision: string;
  onWarning?: (message: string) => void;
}

interface LoadedReadmes {
  pages: DocPage[];
  sections: DocSection[];
  chunks: DocChunk[];
}

const TITLE = /^# +(.+?)(?:\s+#+)?\s*$/;
const MARKDOWN_LINK = /(!?\[[^\]]*\]\()([^)\s]+)((?:\s+"[^"]*")?\))/g;
const ABSOLUTE = /^([a-z][a-z0-9+.-]*:|#|\/\/)/i;

// The CHANGELOG ships too but is release history; it would match version-specific queries ahead of the docs.
function shippedMarkdown(root: string) {
  const manifest = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8')) as { files?: unknown };
  const listed = Array.isArray(manifest.files)
    ? manifest.files.filter((entry) => typeof entry === 'string' && !/^changelog\.md$/i.test(entry))
    : [];
  const names = new Set(['README.md', ...listed.filter((entry) => /^[^/\\]+\.md$/i.test(entry))]);
  return [...names]
    .filter((name) => existsSync(path.join(root, name)))
    .sort((a, b) => (a === 'README.md' ? -1 : b === 'README.md' ? 1 : a < b ? -1 : 1));
}

function firstHeading(markdown: string) {
  let inFence = false;
  for (const line of markdown.split('\n')) {
    if (FENCE.test(line)) inFence = !inFence;
    if (inFence) continue;
    const match = TITLE.exec(line);
    if (match) return match[1];
  }
}

export function rewriteRelativeLinks(markdown: string, packageName: string, fileName: string, revision: string) {
  const fileDirectory = path.posix.dirname(`packages/${packageName}/${fileName}`);
  return mapOutsideFences(markdown, (line) =>
    line.replaceAll(MARKDOWN_LINK, (match, open: string, target: string, close: string) => {
      if (ABSOLUTE.test(target)) return match;
      const hashIndex = target.indexOf('#');
      const file = hashIndex === -1 ? target : target.slice(0, hashIndex);
      const hash = hashIndex === -1 ? '' : target.slice(hashIndex);
      if (file === '') return match;
      const resolved = path.posix.normalize(path.posix.join(fileDirectory, file));
      if (resolved.startsWith('..')) return match;
      const kind = path.posix.extname(resolved) === '' ? 'tree' : 'blob';
      return `${open}${githubUrl(kind, revision, resolved)}${hash}${close}`;
    }),
  );
}

export function loadReadmes(options: LoadReadmesOptions): LoadedReadmes {
  const warn = options.onWarning ?? ((message: string) => console.error(`wb-docs: ${message}`));
  const { revision } = options;
  const pages: DocPage[] = [];
  const sections: DocSection[] = [];
  const chunks: DocChunk[] = [];

  for (const source of options.sources) {
    let files: string[];
    try {
      files = shippedMarkdown(source.root);
    } catch (error) {
      warn(`skipped README files of ${source.name}: ${error instanceof Error ? error.message.split('\n')[0] : error}`);
      continue;
    }
    const seen = new Set<string>();
    for (const fileName of files) {
      const pageId = readmeId(source.name, fileName);
      if (seen.has(pageId)) continue;
      seen.add(pageId);
      let raw: string;
      try {
        raw = readFileSync(path.join(source.root, fileName), 'utf8');
      } catch (error) {
        warn(`skipped ${fileName} of ${source.name}: ${error instanceof Error ? error.message.split('\n')[0] : error}`);
        continue;
      }
      const markdown = rewriteRelativeLinks(raw.replaceAll('\r\n', '\n'), source.name, fileName, revision).trim();
      const title = firstHeading(markdown) ?? source.title;
      const urlFor = (id: string, anchor: string) => readmeUrl(source.name, fileName, anchor, revision);
      const chunked = chunkPage(
        { pageId, title, description: '', markdown, urlFor },
        options.chunking ?? defaultChunking,
      );
      pages.push({
        id: pageId,
        title,
        description: '',
        url: readmeUrl(source.name, fileName, INTRO_ANCHOR, revision),
        content: markdown,
        sectionIds: chunked.sections.map((section) => section.id),
      });
      sections.push(...chunked.sections);
      chunks.push(...chunked.chunks);
    }
  }
  return { pages, sections, chunks };
}
