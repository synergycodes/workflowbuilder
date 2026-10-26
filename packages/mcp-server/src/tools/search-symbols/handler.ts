import { type BudgetConfig, budget as defaultBudget } from '../../config/budget.js';
import { truncateInline } from '../../search/truncate.js';
import type { SymbolEngine, SymbolHit } from '../../symbols/symbol-search.js';
import { fitResults } from '../fit-results.js';
import { parseInput } from '../parse-input.js';
import type { ToolHandler } from '../types.js';
import { SearchSymbolsInputSchema } from './tool.validator.js';

// Name and parent are omitted: the id spells them out as `package:Parent.name`.
interface SearchSymbolsResult {
  id: string;
  kind: string;
  package: string;
  importPath: string;
  signature: string;
  summary?: string;
}

export function formatSearchSymbols(hits: readonly SymbolHit[], limit: number, budget: BudgetConfig = defaultBudget) {
  const { maxSignatureTokens, maxSummaryTokens, maxResponseTokens } = budget.searchSymbols;
  return fitResults(
    hits,
    limit,
    maxResponseTokens,
    ({ item }): SearchSymbolsResult => ({
      id: item.id,
      kind: item.kind,
      package: item.package,
      importPath: item.importPath,
      signature: truncateInline(item.signature.replaceAll(/\s+/g, ' '), maxSignatureTokens),
      ...(item.summary ? { summary: truncateInline(item.summary, maxSummaryTokens) } : {}),
    }),
    'Narrow the query, filter by package or kind, or lower limit.',
  );
}

export function createSearchSymbolsHandler(symbols: SymbolEngine, budget: BudgetConfig = defaultBudget): ToolHandler {
  return async (input) => {
    const { query, package: packageName, kind, limit } = parseInput(SearchSymbolsInputSchema, input);
    const effectiveLimit = limit ?? budget.searchSymbols.defaultLimit;
    const hits = symbols.search(query, { package: packageName, kind }, Number.MAX_SAFE_INTEGER);
    const output = formatSearchSymbols(hits, effectiveLimit, budget);
    if (output.results.length > 0) return output;
    return {
      ...output,
      hint: symbols.canSearch(query)
        ? 'No matching exports. Try a partial name, other keywords, or remove the package and kind filters.'
        : 'The query has no searchable terms (only stopwords, or not English). Use English keywords or an exported name.',
    };
  };
}
