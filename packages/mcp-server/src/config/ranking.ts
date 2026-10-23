interface SearchTuning<Field extends string> {
  boost: Record<Field, number>;
  prefix: boolean;
  prefixMinTermLength: number;
  fuzzy: number;
  fuzzyMinTermLength: number;
  maxFuzzy: number;
  weights: { fuzzy: number; prefix: number };
  combineWith: 'OR' | 'AND';
  bm25: { k: number; b: number; d: number };
}

type DocsField = 'title' | 'headings' | 'description' | 'pageDescription' | 'body';
type SymbolField = 'name' | 'parent' | 'summary' | 'remarks' | 'signature';

export interface DocsRanking extends SearchTuning<DocsField> {
  coordination: number;
  // Weights each query term's score, in every field, by its document-level IDF.
  rarity: boolean;
  // Multiplier per package README (by package name). The sdk and ui READMEs restate site pages and must not outrank them.
  readmeWeights: Record<string, number>;
}

export interface SymbolsRanking extends SearchTuning<SymbolField> {
  memberBoost: number;
  // Score multiplier for hits in a package the query names.
  packageBoost: number;
  // Query word or phrase -> the package it names. The phrase selects the package and is not matched as text.
  packageWords: Record<string, string>;
}

const shared = {
  prefix: true,
  prefixMinTermLength: 4,
  fuzzy: 0.2,
  fuzzyMinTermLength: 5,
  maxFuzzy: 6,
  weights: { fuzzy: 0.45, prefix: 0.375 },
  combineWith: 'OR' as const,
  bm25: { k: 1.2, b: 0.7, d: 0.5 },
};

export const ranking: { docs: DocsRanking; symbols: SymbolsRanking } = {
  docs: {
    ...shared,
    boost: { headings: 10, title: 5, description: 2, pageDescription: 1, body: 1 },
    // Hub chunks win on a single heading word, so scores scale with the share of query terms a chunk matches.
    coordination: 1,
    // Per-field IDF lets a word common across the docs (node, editor, plugin) score as rare in titles and headings.
    rarity: true,
    readmeWeights: { sdk: 0.1, ui: 0.1, temporal: 0.5 },
  },
  symbols: {
    ...shared,
    boost: { name: 10, parent: 2, summary: 2, remarks: 1, signature: 1 },
    // Members carry their parent's words, so at full weight they crowd top-level exports out of the first results.
    memberBoost: 0.3,
    // The name-to-summary boost ratio: a prose match in the named package ties a name match in another one.
    packageBoost: 5,
    // A bare "ui" or "sdk" is not listed: such words are also ordinary terms of other packages' symbols.
    packageWords: {
      temporal: 'temporal',
      // Only the Temporal plugin runs in a worker, yet no export names it. A synonym such as plugin pulls in SDK plugins.
      worker: 'temporal',
      '@workflowbuilder/ui': 'ui',
      'ui library': 'ui',
      'ui package': 'ui',
      'ui component': 'ui',
      'ui components': 'ui',
    },
  },
};
