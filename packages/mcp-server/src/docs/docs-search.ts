import MiniSearch, { type SearchOptions } from 'minisearch';

import { type DocsRanking, ranking as defaultRanking } from '../config/ranking.js';
import { synonyms as defaultSynonyms } from '../config/synonyms.js';
import { type SynonymConfig, createProcessTerm, hasSearchableTerms } from '../search/query-terms.js';
import { tokenize } from '../search/tokenize.js';
import { README_ID_PREFIX } from './doc-ids.js';
import type { DocChunk, DocPage, DocSection } from './types.js';

export interface DocsData {
  pages: DocPage[];
  sections: DocSection[];
  chunks: DocChunk[];
}

interface DocsEngineOptions {
  ranking?: DocsRanking;
  synonyms?: SynonymConfig;
}

export interface DocsHit {
  chunk: DocChunk;
  score: number;
}

const OWN_FIELDS = ['title', 'headings', 'description', 'body'];

function createIndex(synonyms: SynonymConfig) {
  return new MiniSearch({
    idField: 'chunkId',
    fields: [...OWN_FIELDS, 'pageDescription'],
    tokenize,
    processTerm: createProcessTerm(synonyms, false) as (term: string) => string,
  });
}

export class DocsEngine {
  readonly pages: ReadonlyMap<string, DocPage>;
  readonly sections: ReadonlyMap<string, DocSection>;
  readonly chunks: ReadonlyMap<string, DocChunk>;
  private readonly subAnchors = new Map<string, string>();
  // README chunks get their own index so their words do not shift term statistics for the docs pages.
  private readonly index: MiniSearch;
  private readonly readmeIndex: MiniSearch;
  // Number of site chunks containing each term in any own field.
  private readonly readmeTerms = new Set<string>();
  private readonly chunkFrequency = new Map<string, number>();
  private readonly siteChunkCount: number;
  private readonly ranking: DocsRanking;
  private readonly synonyms: SynonymConfig;

  constructor(data: DocsData, options: DocsEngineOptions = {}) {
    this.ranking = options.ranking ?? defaultRanking.docs;
    this.synonyms = options.synonyms ?? defaultSynonyms;
    this.pages = new Map(data.pages.map((page) => [page.id, page]));
    this.sections = new Map(data.sections.map((section) => [section.id, section]));
    this.chunks = new Map(data.chunks.map((chunk) => [chunk.chunkId, chunk]));
    for (const section of data.sections) {
      for (const anchor of section.subAnchors) {
        const key = `${section.pageId}#${anchor}`;
        if (!this.sections.has(key) && !this.subAnchors.has(key)) this.subAnchors.set(key, section.id);
      }
    }
    this.index = createIndex(this.synonyms);
    this.readmeIndex = createIndex(this.synonyms);
    const siteChunks = data.chunks.filter((chunk) => !chunk.pageId.startsWith(README_ID_PREFIX));
    this.index.addAll(siteChunks);
    this.siteChunkCount = siteChunks.length;
    for (const chunk of siteChunks) {
      const text = OWN_FIELDS.map((field) => chunk[field as keyof DocChunk]).join(' ');
      for (const term of new Set(tokenize(text).map((token) => token.toLowerCase()))) {
        this.chunkFrequency.set(term, (this.chunkFrequency.get(term) ?? 0) + 1);
      }
    }
    const readmeChunks = data.chunks.filter((chunk) => chunk.pageId.startsWith(README_ID_PREFIX));
    this.readmeIndex.addAll(readmeChunks);
    for (const chunk of readmeChunks) {
      for (const token of tokenize(OWN_FIELDS.map((field) => chunk[field as keyof DocChunk]).join(' '))) {
        this.readmeTerms.add(token.toLowerCase());
      }
    }
  }

  // A section id, or the id of the H2 section that contains the given H3 anchor.
  sectionFor(id: string) {
    const direct = this.sections.get(id);
    if (direct) return direct;
    const parent = this.subAnchors.get(id);
    return parent ? this.sections.get(parent) : undefined;
  }

  canSearch(query: string) {
    return hasSearchableTerms(query, tokenize, this.synonyms);
  }

  search(query: string, limit: number): DocsHit[] {
    if (!this.canSearch(query)) return [];
    const { ranking } = this;
    const options: SearchOptions = {
      boost: ranking.boost,
      ...this.matching(),
      weights: ranking.weights,
      combineWith: ranking.combineWith,
      bm25: ranking.bm25,
      tokenize,
      processTerm: createProcessTerm(this.synonyms, true, query) as (term: string) => string,
      boostTerm: (term) => (ranking.rarity ? this.rarity(term) : 1),
    };

    const searches = [this.index, this.readmeIndex].map((index) => ({
      index,
      results: index.search(query, options),
      // Coverage counts the query terms a chunk matches in its own text; a page description match alone answers nothing.
      ownTerms: new Map(
        index.search(query, { ...options, fields: OWN_FIELDS }).map((result) => [result.id, result.queryTerms.length]),
      ),
    }));
    // One denominator for both indexes: a README chunk covering fewer query terms than a site page is not full coverage.
    const mostTermsMatched = Math.max(1, ...searches.flatMap(({ ownTerms }) => [...ownTerms.values()]));
    const hits: DocsHit[] = [];
    for (const { index, results, ownTerms } of searches) {
      for (const result of results) {
        const chunk = this.chunks.get(result.id as string);
        if (!chunk) continue;
        const coverage = ((ownTerms.get(result.id) ?? 0) / mostTermsMatched) ** ranking.coordination;
        const weight = index === this.index ? 1 : (ranking.readmeWeights[chunk.pageId.split('/')[1]] ?? 1);
        const score = result.score * coverage * weight;
        if (score > 0) hits.push({ chunk, score });
      }
    }
    hits.sort((a, b) => b.score - a.score || (a.chunk.chunkId < b.chunk.chunkId ? -1 : 1));

    return hits.slice(0, limit);
  }

  // BM25 inverse document frequency over whole site chunks. A term no chunk contains weighs as the commonest indexed
  // term it prefix or fuzzy matches (a plural, a typo); with no such match it is the rarest word, or neutral when the
  // READMEs do not contain it either.
  private rarity(term: string) {
    let frequency = this.chunkFrequency.get(term);
    if (frequency === undefined) {
      const matched = this.index
        .search(term, { ...this.matching(), fields: OWN_FIELDS })
        .flatMap((result) => result.terms);
      frequency = Math.max(0, ...matched.map((indexed) => this.chunkFrequency.get(indexed) ?? 0));
      if (frequency === 0 && !this.readmeTerms.has(term)) return 1;
    }
    return Math.log(1 + (this.siteChunkCount - frequency + 0.5) / (frequency + 0.5));
  }

  private matching(): SearchOptions {
    const { ranking } = this;
    return {
      prefix: (term) => ranking.prefix && term.length >= ranking.prefixMinTermLength,
      fuzzy: (term) => (term.length >= ranking.fuzzyMinTermLength ? ranking.fuzzy : false),
      maxFuzzy: ranking.maxFuzzy,
      tokenize,
      processTerm: (term) => term.toLowerCase(),
    };
  }

  suggest(ref: string, limit = 3) {
    const segment = (ref.split('#')[0].split('/').at(-1) ?? '').toLowerCase();
    if (!segment) return [];
    return [...this.pages.keys()].filter((id) => id.split('/').some((part) => part.includes(segment))).slice(0, limit);
  }
}
