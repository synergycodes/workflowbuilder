import MiniSearch from 'minisearch';

import { type SymbolsRanking, ranking as defaultRanking } from '../config/ranking.js';
import { synonyms as defaultSynonyms } from '../config/synonyms.js';
import { type SynonymConfig, createProcessTerm, hasSearchableTerms } from '../search/query-terms.js';
import { tokenize } from '../search/tokenize.js';
import type { ApiMember, ApiSymbol } from './extract-symbols.js';

type SymbolItem = ApiSymbol | ApiMember;

export interface SymbolHit {
  item: SymbolItem;
  score: number;
}

interface SymbolFilters {
  package?: string;
  kind?: string;
}

interface SymbolEngineOptions {
  ranking?: SymbolsRanking;
  synonyms?: SynonymConfig;
}

export function isMember(item: SymbolItem): item is ApiMember {
  return 'parent' in item;
}

type Resolution = { found: SymbolItem } | { ambiguous: string[] } | { missing: true };

export class SymbolEngine {
  // Exported symbols only: the searchable surface and the corpus statistics.
  readonly symbols: ReadonlyMap<string, ApiSymbol>;
  readonly items: ReadonlyMap<string, SymbolItem>;
  // Every symbol get_symbol can resolve, including types the packages reference but do not export.
  private readonly lookup = new Map<string, SymbolItem>();
  private readonly byName = new Map<string, ApiSymbol[]>();
  private readonly index: MiniSearch;
  private readonly ranking: SymbolsRanking;
  private readonly synonyms: SynonymConfig;

  constructor(symbols: ApiSymbol[], options: SymbolEngineOptions = {}) {
    this.ranking = options.ranking ?? defaultRanking.symbols;
    this.synonyms = options.synonyms ?? defaultSynonyms;
    this.symbols = new Map(symbols.filter((symbol) => symbol.exported !== false).map((symbol) => [symbol.id, symbol]));
    const items = new Map<string, SymbolItem>();
    for (const symbol of symbols) {
      const searchable = symbol.exported !== false;
      for (const item of [symbol, ...symbol.members]) {
        this.lookup.set(item.id, item);
        if (searchable) items.set(item.id, item);
      }
      this.byName.set(symbol.name, [...(this.byName.get(symbol.name) ?? []), symbol]);
    }
    this.items = items;
    this.index = new MiniSearch({
      idField: 'id',
      fields: ['name', 'parent', 'summary', 'remarks', 'signature'],
      tokenize,
      processTerm: createProcessTerm(this.synonyms, false) as (term: string) => string,
    });
    this.index.addAll(
      [...items.values()].map((item) => ({
        id: item.id,
        name: item.name,
        parent: isMember(item) ? item.parent : '',
        summary: item.summary,
        remarks: remarksOf(item) || propsProseOf(item, this.symbols),
        signature: item.signature,
      })),
    );
  }

  get memberCount() {
    return this.items.size - this.symbols.size;
  }

  canSearch(query: string) {
    return hasSearchableTerms(query, tokenize, this.synonyms);
  }

  search(query: string, filters: SymbolFilters, limit: number): SymbolHit[] {
    if (!this.canSearch(query)) return [];
    const { ranking } = this;
    const tokens = tokenize(query);
    const lowered = tokens.map((token) => token.toLowerCase());
    let named: { packageName: string; remainder: string } | undefined;
    for (const [phrase, packageName] of Object.entries(ranking.packageWords)) {
      const words = lowerTokens(phrase);
      const start = lowered.findIndex((_, at) => words.every((word, offset) => lowered[at + offset] === word));
      if (start === -1) continue;
      named = { packageName, remainder: [...tokens.slice(0, start), ...tokens.slice(start + words.length)].join(' ') };
      break;
    }

    // The words naming a package select it and are not matched as text; the package name is matched as text only
    // when no hit of that package matches the rest of the query.
    const merged = new Map<string, number>();
    const collect = (text: string) => {
      for (const result of this.rawSearch(text)) {
        merged.set(result.id as string, Math.max(merged.get(result.id as string) ?? 0, result.score));
      }
    };
    if (named && this.canSearch(named.remainder)) collect(named.remainder);
    const inPackage = (id: string) => this.items.get(id)?.package === named?.packageName;
    if (!named) collect(query);
    else if (![...merged.keys()].some(inPackage)) collect(`${named.remainder} ${named.packageName}`);

    const hits: SymbolHit[] = [];
    for (const [id, score] of merged) {
      const item = this.items.get(id);
      if (!item) continue;
      if (filters.package && item.package !== filters.package) continue;
      if (filters.kind && item.kind !== filters.kind) continue;
      hits.push({ item, score: named && item.package === named.packageName ? score * ranking.packageBoost : score });
    }
    hits.sort((a, b) => b.score - a.score || (a.item.id < b.item.id ? -1 : 1));
    return hits.slice(0, limit);
  }

  private rawSearch(query: string) {
    const { ranking } = this;
    return this.index.search(query, {
      boost: ranking.boost,
      prefix: (term) => ranking.prefix && term.length >= ranking.prefixMinTermLength,
      fuzzy: (term) => (term.length >= ranking.fuzzyMinTermLength ? ranking.fuzzy : false),
      maxFuzzy: ranking.maxFuzzy,
      weights: ranking.weights,
      combineWith: ranking.combineWith,
      bm25: ranking.bm25,
      tokenize,
      processTerm: createProcessTerm(this.synonyms, true, query) as (term: string) => string,
      boostDocument: (id) => (isMember(this.items.get(id) as SymbolItem) ? ranking.memberBoost : 1),
    });
  }

  symbolById(id: string) {
    const found = this.lookup.get(id);
    return found && !isMember(found) ? found : undefined;
  }

  // Package prefix, symbol name and member name match case-insensitively; `Parent.Child` falls back to the symbol named ParentChild.
  resolve(name: string): Resolution {
    const direct = this.lookup.get(name);
    if (direct) return { found: direct };
    const colon = name.indexOf(':');
    return this.resolveName(
      colon === -1 ? name : name.slice(colon + 1),
      colon === -1 ? undefined : name.slice(0, colon),
    );
  }

  private namedLike(name: string, packageName: string | undefined) {
    const exact = this.byName.get(name) ?? [];
    const lower = name.toLowerCase();
    const candidates =
      exact.length > 0
        ? exact
        : [...this.byName.values()].flat().filter((symbol) => symbol.name.toLowerCase() === lower);
    return packageName ? candidates.filter((symbol) => symbol.package === packageName.toLowerCase()) : candidates;
  }

  private resolveName(path: string, packageName: string | undefined): Resolution {
    const dot = path.indexOf('.');
    const parentName = dot === -1 ? path : path.slice(0, dot);
    const memberName = dot === -1 ? undefined : path.slice(dot + 1);
    let candidates = this.namedLike(parentName, packageName);
    if (memberName !== undefined) {
      const withMember = candidates.filter((symbol) => findMember(symbol, memberName));
      candidates = withMember.length > 0 ? withMember : this.namedLike(parentName + memberName, packageName);
      if (withMember.length === 0) {
        if (candidates.length === 0) return { missing: true };
        return candidates.length === 1
          ? { found: candidates[0] }
          : { ambiguous: candidates.map((symbol) => symbol.id) };
      }
    }
    if (candidates.length === 0) return { missing: true };
    if (candidates.length > 1) {
      return {
        ambiguous: candidates.map((symbol) => (memberName === undefined ? symbol.id : `${symbol.id}.${memberName}`)),
      };
    }
    const [symbol] = candidates;
    if (memberName === undefined) return { found: symbol };
    const member = findMember(symbol, memberName);
    return member ? { found: member } : { missing: true };
  }
}

// The JSDoc after its first sentence, without code examples: their identifiers match generic query words.
function remarksOf(item: SymbolItem) {
  const prose = withoutCode(item.description);
  return prose.startsWith(item.summary) ? prose.slice(item.summary.length) : prose;
}

// An undocumented component is described by the JSDoc of its `<Name>Props` type and that type's members.
function propsProseOf(item: SymbolItem, symbols: ReadonlyMap<string, ApiSymbol>) {
  if (isMember(item) || item.description) return '';
  const props = symbols.get(`${item.package}:${item.name}Props`);
  return props ? withoutCode([props.description, ...props.members.map((member) => member.summary)].join(' ')) : '';
}

function withoutCode(text: string) {
  return text
    .replaceAll(/```[\s\S]*?(```|$)/g, ' ')
    .replaceAll(/\s+/g, ' ')
    .trim();
}

function lowerTokens(text: string) {
  return tokenize(text).map((token) => token.toLowerCase());
}

function findMember(symbol: ApiSymbol, name: string) {
  const lower = name.toLowerCase();
  return (
    symbol.members.find((member) => member.name === name) ??
    symbol.members.find((member) => member.name.toLowerCase() === lower)
  );
}
