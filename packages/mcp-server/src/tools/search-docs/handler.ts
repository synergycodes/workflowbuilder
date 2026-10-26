import { type BudgetConfig, budget as defaultBudget } from '../../config/budget.js';
import type { DocsEngine, DocsHit } from '../../docs/docs-search.js';
import { bestExcerptStart } from '../../search/match-position.js';
import { excerptFrom } from '../../search/truncate.js';
import { fitResults } from '../fit-results.js';
import { pageOutline } from '../page-outline.js';
import { parseInput } from '../parse-input.js';
import type { ToolHandler } from '../types.js';
import { SearchDocsInputSchema } from './tool.validator.js';

interface SearchDocsResult {
  id: string;
  title: string;
  section: string;
  url: string;
  content: string;
  truncated?: true;
}

// The section field already names the heading the chunk opens with.
function withoutHeading(content: string, section: string) {
  const [first, ...rest] = content.split('\n');
  const heading = /^#{1,6}\s+(.*)$/.exec(first)?.[1].replaceAll('`', '').trim();
  return heading && section.endsWith(heading) ? rest.join('\n').trimStart() : content;
}

const OUTLINED_HITS = 3;
const MAX_OTHER_SECTIONS_PER_PAGE = 8;

// For the pages of the top hits, the anchors of the sections no hit covers, in document order.
function otherSections(docs: DocsEngine, hits: readonly DocsHit[]) {
  const covered = new Set(hits.map(({ chunk }) => chunk.sectionId));
  const pageIds = new Set(hits.slice(0, OUTLINED_HITS).map(({ chunk }) => chunk.pageId));
  const others: Record<string, string[]> = {};
  for (const pageId of pageIds) {
    const page = docs.pages.get(pageId);
    if (!page) continue;
    const entries = pageOutline(docs, page)
      .filter((section) => !covered.has(section.id))
      .map((section) => section.id.slice(section.id.indexOf('#') + 1));
    if (entries.length === 0) continue;
    const extra = entries.length - MAX_OTHER_SECTIONS_PER_PAGE;
    others[pageId] = extra > 0 ? [...entries.slice(0, MAX_OTHER_SECTIONS_PER_PAGE), `+${extra} more`] : entries;
  }
  return others;
}

export function formatSearchDocs(
  hits: readonly DocsHit[],
  limit: number,
  budget: BudgetConfig = defaultBudget,
  query?: string,
  docs?: DocsEngine,
) {
  const { maxExcerptChars, maxResponseTokens } = budget.searchDocs;
  const fitted = fitResults(
    hits,
    limit,
    maxResponseTokens,
    ({ chunk }): SearchDocsResult => {
      const text = withoutHeading(chunk.content, chunk.section);
      const start = query ? bestExcerptStart(text, query, maxExcerptChars) : 0;
      const content = excerptFrom(text, maxExcerptChars, start);
      return {
        id: chunk.chunkId,
        title: chunk.title,
        section: chunk.section,
        url: chunk.url,
        content: content.text,
        ...(content.truncated ? { truncated: true } : {}),
      };
    },
    'Narrow the query or lower limit to see fewer, shorter results.',
  );
  if (!docs) return fitted;
  const others = otherSections(docs, hits.slice(0, fitted.results.length));
  return Object.keys(others).length > 0 ? { ...fitted, otherSections: others } : fitted;
}

export function createSearchDocsHandler(docs: DocsEngine, budget: BudgetConfig = defaultBudget): ToolHandler {
  return async (input) => {
    const { query, limit } = parseInput(SearchDocsInputSchema, input);
    const effectiveLimit = limit ?? budget.searchDocs.defaultLimit;
    const output = formatSearchDocs(docs.search(query, Number.MAX_SAFE_INTEGER), effectiveLimit, budget, query, docs);
    if (output.results.length > 0) return output;
    return {
      ...output,
      hint: docs.canSearch(query)
        ? 'No matching sections. The docs are in English: try other keywords or an exported name.'
        : 'The query has no searchable terms (only stopwords, or not English). Use English keywords or an exported name.',
    };
  };
}
