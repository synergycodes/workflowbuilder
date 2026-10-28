import GithubSlugger from 'github-slugger';

import { BASE, SITE } from '../config/site.js';

export const INTRO_ANCHOR = '_intro';
export const README_ID_PREFIX = 'readme/';

export function pageIdFromPath(relativePath: string) {
  let id = relativePath.replaceAll('\\', '/').replace(/\.mdx?$/, '');
  id = id.replace(/(^|\/)index$/, '');
  return id.toLowerCase() || 'index';
}

export function pageUrl(pageId: string, anchor?: string) {
  const path = pageId === 'index' ? '' : `${pageId}/`;
  const hash = anchor && anchor !== INTRO_ANCHOR ? `#${anchor}` : '';
  return `${SITE}${BASE}/${path}${hash}`;
}

const GITHUB_BLOB = 'https://github.com/synergycodes/workflowbuilder/blob/main';
const README_FILE = /^packages\/([^/]+)\/([^/]+)\.md$/i;

export function readmeId(packageName: string, fileName: string) {
  const name = fileName.replace(/\.md$/i, '').toLowerCase();
  return name === 'readme' ? `readme/${packageName}` : `readme/${packageName}/${name}`;
}

export function readmeUrl(packageName: string, fileName: string, anchor?: string) {
  const hash = anchor && anchor !== INTRO_ANCHOR ? `#${anchor}` : '';
  return `${GITHUB_BLOB}/packages/${packageName}/${fileName}${hash}`;
}

export function sectionId(pageId: string, anchor: string) {
  return `${pageId}#${anchor}`;
}

export function chunkId(section: string, index: number) {
  return index === 0 ? section : `${section}~${index + 1}`;
}

export function createAnchorSlugger() {
  const slugger = new GithubSlugger();
  return (headingText: string) => slugger.slug(headingText);
}

const SITE_ORIGIN = /^https?:\/\/(www\.)?workflowbuilder\.io/i;

export class InvalidDocRefError extends Error {}

export function normalizeDocRef(input: string) {
  let ref = input.trim().replaceAll('\\', '/');
  if (ref.includes('\0')) throw new InvalidDocRefError('Invalid document id: contains NUL');
  if (ref.startsWith(`${GITHUB_BLOB}/`)) {
    const [target, ...hash] = ref.slice(GITHUB_BLOB.length + 1).split('#');
    const file = target.replace(/\?.*$/, '');
    const match = README_FILE.exec(file);
    if (match) ref = `${readmeId(match[1], `${match[2]}.md`)}${hash.length > 0 ? `#${hash.join('#')}` : ''}`;
  }
  ref = ref.replace(SITE_ORIGIN, '');
  if (ref.startsWith(`${BASE}/`) || ref === BASE) ref = ref.slice(BASE.length);
  const hashIndex = ref.indexOf('#');
  let path = (hashIndex === -1 ? ref : ref.slice(0, hashIndex)).replace(/\?.*$/, '');
  let hash = hashIndex === -1 ? '' : ref.slice(hashIndex + 1).toLowerCase();
  path = path.replace(/^\//, '').replace(/\/$/, '');
  if (path.startsWith('/') || path.split('/').includes('..')) {
    throw new InvalidDocRefError(`Invalid document id: ${input}`);
  }
  path = path.replace(/\.mdx?$/, '').replace(/(^|\/)index$/, '');
  path = path.toLowerCase();
  hash = hash.replace(/~\d+$/, '');
  if (path === '' && hash === '') path = 'index';
  return hash ? `${path}#${hash}` : path;
}

export function splitSectionId(id: string) {
  const hashIndex = id.indexOf('#');
  return hashIndex === -1
    ? { pageId: id, anchor: undefined }
    : { pageId: id.slice(0, hashIndex), anchor: id.slice(hashIndex + 1) };
}
