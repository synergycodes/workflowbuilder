import { synonyms } from '../config/synonyms.js';
import { tokenize } from './tokenize.js';

const MIN_TERM_LENGTH = 3;

function queryTerms(query: string) {
  const stopwords = new Set(synonyms.stopwords);
  const terms = new Set<string>();
  for (const token of tokenize(query)) {
    const lower = token.toLowerCase();
    if (lower.length >= MIN_TERM_LENGTH && !stopwords.has(lower)) terms.add(lower);
  }
  return [...terms];
}

interface Occurrence {
  position: number;
  term: number;
}

// Where an excerpt of `windowChars` should start: the occurrence that opens the tightest cluster holding the most
// distinct query terms. Returns 0 when that cluster already fits in the first window.
export function bestExcerptStart(content: string, query: string, windowChars: number) {
  const lower = content.toLowerCase();
  const occurrences: Occurrence[] = [];
  for (const [term, word] of queryTerms(query).entries()) {
    const forms = new Set([word, word.replace(/s$/, '')]);
    for (const form of forms) {
      for (let at = lower.indexOf(form); at !== -1; at = lower.indexOf(form, at + form.length)) {
        occurrences.push({ position: at, term });
      }
    }
  }
  occurrences.sort((a, b) => a.position - b.position);

  let best = { start: 0, distinct: 0, span: 0 };
  for (const [index, first] of occurrences.entries()) {
    const seen = new Set<number>();
    let span = 0;
    for (const next of occurrences.slice(index)) {
      if (next.position >= first.position + windowChars) break;
      if (!seen.has(next.term)) span = next.position - first.position;
      seen.add(next.term);
    }
    if (seen.size > best.distinct || (seen.size === best.distinct && span < best.span)) {
      best = { start: first.position, distinct: seen.size, span };
    }
  }
  return best.start + best.span < windowChars ? 0 : best.start;
}
