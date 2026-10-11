import { type BudgetConfig, budget as defaultBudget } from '../../config/budget.js';
import { INTRO_ANCHOR, normalizeDocRef, pageUrl, splitSectionId } from '../../docs/doc-ids.js';
import type { DocsEngine } from '../../docs/docs-search.js';
import type { DocPage, DocSection } from '../../docs/types.js';
import { estimateTokens } from '../../search/tokens.js';
import { truncateToTokens } from '../../search/truncate.js';
import type { SymbolEngine } from '../../symbols/symbol-search.js';
import { parseInput } from '../parse-input.js';
import type { ToolHandler } from '../types.js';
import { GetDocInputSchema } from './tool.validator.js';

interface GetDocOutput {
  id: string;
  title: string;
  section?: string;
  description: string;
  url: string;
  content: string;
  truncated: boolean;
  sections?: { id: string; title: string }[];
}

const API_REFERENCE_ROOTS = new Set(['api', 'ui-api']);
const MIN_CONTENT_TOKENS = 50;
const SHRINK_FACTOR = 0.9;
const MAX_SHRINK_ATTEMPTS = 40;

function notFound(docs: DocsEngine, id: string): never {
  const suggestions = docs.suggest(id);
  const hint = suggestions.length > 0 ? `. Did you mean: ${suggestions.join(', ')}?` : '';
  throw new Error(`Document not found: ${id}${hint}`);
}

// TypeDoc reference pages are not documents; their content is served by get_symbol.
function apiReferenceError(pageId: string, symbols: SymbolEngine | undefined): string | undefined {
  const [root, ...rest] = pageId.split('/');
  if (!API_REFERENCE_ROOTS.has(root) || rest.length === 0) return undefined;
  const name = rest.at(-1) as string;
  const resolution = symbols?.resolve(name);
  if (resolution && 'found' in resolution) {
    return `"${pageId}" is an API reference page, not a document. Use get_symbol with "${resolution.found.id}".`;
  }
  if (resolution && 'ambiguous' in resolution) {
    return `"${pageId}" is an API reference page, not a document. Use get_symbol with one of: ${resolution.ambiguous.join(', ')}.`;
  }
  return `"${pageId}" is an API reference page, not a document. Use get_symbol with the symbol name "${name}", or search_symbols.`;
}

function sectionList(docs: DocsEngine, page: DocPage) {
  return page.sectionIds
    .map((sectionId) => docs.sections.get(sectionId))
    .filter((candidate): candidate is DocSection => candidate !== undefined && candidate.anchor !== INTRO_ANCHOR)
    .filter((candidate) => hasBody(candidate))
    .map((candidate) => ({ id: candidate.id, title: candidate.title }));
}

export function createGetDocHandler(
  docs: DocsEngine,
  budget: BudgetConfig = defaultBudget,
  symbols?: SymbolEngine,
): ToolHandler {
  const maxTokens = budget.getDoc.maxResponseTokens;
  const fits = (output: GetDocOutput) => estimateTokens(JSON.stringify(output)) <= maxTokens;

  return async (input) => {
    const { id: rawId } = parseInput(GetDocInputSchema, input);
    const requested = normalizeDocRef(rawId);
    const { pageId, anchor } = splitSectionId(requested);
    const page = docs.pages.get(pageId);
    if (!page) {
      const apiMessage = apiReferenceError(pageId, symbols);
      if (apiMessage) throw new Error(apiMessage);
      notFound(docs, requested);
    }

    const section = anchor === undefined ? undefined : docs.sectionFor(requested);
    if (anchor !== undefined && !section) notFound(docs, requested);

    const output: GetDocOutput = {
      id: section ? section.id : pageId,
      title: page.title,
      ...(section ? { section: section.title } : {}),
      description: page.description,
      url: section ? pageUrl(pageId, section.anchor) : page.url,
      content: section ? section.content : page.content,
      truncated: false,
    };
    if (fits(output)) return output;

    // Over the cap: a page keeps its intro and lists its sections; a section is cut where the cap falls.
    output.truncated = true;
    output.sections = sectionList(docs, page);
    const intro = section ? undefined : docs.sections.get(page.sectionIds[0] ?? '');
    const body = section ? section.content : intro?.anchor === INTRO_ANCHOR ? intro.content : '';
    const overhead = estimateTokens(JSON.stringify({ ...output, content: '' }));
    let allowed = maxTokens - overhead;
    for (let attempt = 0; attempt < MAX_SHRINK_ATTEMPTS; attempt++) {
      output.content = truncateToTokens(body, Math.max(MIN_CONTENT_TOKENS, allowed)).text;
      if (fits(output) || allowed <= MIN_CONTENT_TOKENS) break;
      allowed = Math.floor(allowed * SHRINK_FACTOR);
    }
    return output;
  };
}

// A section that is only its heading would send the agent on a fetch with nothing to read.
function hasBody(section: DocSection) {
  return section.content.trim().split(/\r?\n/).length > 1;
}
