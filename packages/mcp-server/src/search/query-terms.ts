import { synonyms as defaultSynonyms } from '../config/synonyms.js';
import { tokenize } from './tokenize.js';

export type SynonymConfig = typeof defaultSynonyms;

export function createProcessTerm(synonyms: SynonymConfig, queryTime: boolean, query = '') {
  const stopwords = new Set(synonyms.stopwords);
  const productTerms = new Set(synonyms.productTerms);
  const isTopic = (token: string) => !stopwords.has(token.toLowerCase()) && !productTerms.has(token.toLowerCase());
  const dropProductTerms = queryTime && tokenize(query).some(isTopic);
  return (term: string): string | string[] | null => {
    const lower = term.toLowerCase();
    if (!queryTime) return lower;
    if (stopwords.has(lower) || (dropProductTerms && productTerms.has(lower))) return null;
    const extra = Object.hasOwn(synonyms.map, lower) ? synonyms.map[lower] : undefined;
    return extra && extra.length > 0 ? [lower, ...extra] : lower;
  };
}

export function hasSearchableTerms(query: string, tokenize: (text: string) => string[], synonyms: SynonymConfig) {
  const stopwords = new Set(synonyms.stopwords);
  return tokenize(query).some((token) => !stopwords.has(token.toLowerCase()));
}
