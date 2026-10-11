import { type BudgetConfig, budget as defaultBudget } from '../../config/budget.js';
import type { DocsEngine, DocsHit } from '../../docs/docs-search.js';
import { bestExcerptStart } from '../../search/match-position.js';
import { excerptFrom } from '../../search/truncate.js';
import { fitResults } from '../fit-results.js';
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

export function formatSearchDocs(
  hits: readonly DocsHit[],
  limit: number,
  budget: BudgetConfig = defaultBudget,
  query?: string,
) {
  const { maxExcerptChars, maxResponseTokens } = budget.searchDocs;
  return fitResults(
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
}

export function createSearchDocsHandler(docs: DocsEngine, budget: BudgetConfig = defaultBudget): ToolHandler {
  return async (input) => {
    const { query, limit } = parseInput(SearchDocsInputSchema, input);
    const effectiveLimit = limit ?? budget.searchDocs.defaultLimit;
    const output = formatSearchDocs(docs.search(query, Number.MAX_SAFE_INTEGER), effectiveLimit, budget, query);
    if (output.results.length > 0) return output;
    return {
      ...output,
      hint: docs.canSearch(query)
        ? 'No matching sections. The docs are in English: try other keywords or an exported name.'
        : 'The query has no searchable terms (only stopwords, or not English). Use English keywords or an exported name.',
    };
  };
}
