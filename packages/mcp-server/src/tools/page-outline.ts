import { INTRO_ANCHOR } from '../docs/doc-ids.js';
import type { DocsEngine } from '../docs/docs-search.js';
import type { DocPage, DocSection } from '../docs/types.js';

// A section that is only its heading would send the agent on a fetch with nothing to read.
function hasBody(section: DocSection) {
  return section.content.trim().split(/\r?\n/).length > 1;
}

export function pageOutline(docs: DocsEngine, page: DocPage) {
  return page.sectionIds
    .map((sectionId) => docs.sections.get(sectionId))
    .filter((candidate): candidate is DocSection => candidate !== undefined && candidate.anchor !== INTRO_ANCHOR)
    .filter((candidate) => hasBody(candidate))
    .map((candidate) => ({ id: candidate.id, title: candidate.title }));
}
