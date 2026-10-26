import { estimateTokens } from '../search/tokens.js';

interface FittedResults<Result> {
  results: Result[];
  // Set when the response size limit dropped hits that matched; `total` counts every hit.
  truncated?: true;
  total?: number;
  hint?: string;
}

// Keeps leading results while the serialized response stays within `maxTokens`; always keeps the first.
export function fitResults<Hit, Result>(
  hits: readonly Hit[],
  limit: number,
  maxTokens: number,
  toResult: (hit: Hit) => Result,
  truncationHint: string,
): FittedResults<Result> {
  const wanted = hits.slice(0, limit);
  const results: Result[] = [];
  let tokens = estimateTokens('{"results":[]}');
  for (const hit of wanted) {
    const result = toResult(hit);
    const cost = estimateTokens(JSON.stringify(result)) + 1;
    if (results.length > 0 && tokens + cost > maxTokens) break;
    tokens += cost;
    results.push(result);
  }
  if (results.length < wanted.length) {
    return {
      results,
      truncated: true,
      total: hits.length,
      hint: `Response size limit reached: showing ${results.length} of ${hits.length} hits. ${truncationHint}`,
    };
  }
  return { results };
}
