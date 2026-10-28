import { type SymbolsRanking, ranking as defaultRanking } from '../config/ranking.js';
import type { ApiSymbol } from './extract-symbols.js';
import { SymbolEngine, isMember } from './symbol-search.js';

function symbol(packageName: string, name: string, overrides: Partial<ApiSymbol> = {}): ApiSymbol {
  return {
    id: `${packageName}:${name}`,
    name,
    kind: 'type',
    package: packageName,
    importPath: `@scope/${packageName}`,
    typeOnly: true,
    signature: `type ${name} = unknown`,
    description: '',
    summary: '',
    source: 'a.ts:1',
    members: [],
    ...overrides,
  };
}

const ranking = (overrides: Partial<SymbolsRanking> = {}): SymbolsRanking => ({
  ...defaultRanking.symbols,
  ...overrides,
});
const synonyms = { map: {}, stopwords: [] };

const symbols = [
  symbol('sdk', 'WorkflowBuilderRootProps', {
    summary: 'Props accepted by the root.',
    members: [
      {
        id: 'sdk:WorkflowBuilderRootProps.nodeTypes',
        name: 'nodeTypes',
        kind: 'property',
        package: 'sdk',
        parent: 'WorkflowBuilderRootProps',
        importPath: '@scope/sdk',
        signature: 'nodeTypes?: PaletteItem[]',
        description: '',
        summary: 'Node type definitions.',
      },
    ],
  }),
  symbol('sdk', 'EdgeLabel', { kind: 'function' }),
  symbol('ui', 'EdgeLabel', { kind: 'const', typeOnly: false }),
  symbol('sdk', 'useStore', { kind: 'const' }),
  symbol('sdk', 'RootHelper', { kind: 'function', summary: 'Helps WorkflowBuilderRootProps users.' }),
];

describe('SymbolEngine search', () => {
  it('ranks an exact name first', () => {
    const engine = new SymbolEngine(symbols, { ranking: ranking(), synonyms });
    expect(engine.search('WorkflowBuilderRootProps', {}, 5)[0].item.id).toBe('sdk:WorkflowBuilderRootProps');
  });

  it('finds members by name and exposes their parent', () => {
    const engine = new SymbolEngine(symbols, { ranking: ranking(), synonyms });
    const hit = engine.search('nodeTypes', {}, 5)[0];
    expect(hit.item.id).toBe('sdk:WorkflowBuilderRootProps.nodeTypes');
    expect(isMember(hit.item)).toBe(true);
  });

  it('matches prefixes and fuzzy typos', () => {
    const engine = new SymbolEngine(symbols, { ranking: ranking(), synonyms });
    expect(engine.search('useSto', {}, 5)[0].item.id).toBe('sdk:useStore');
    expect(engine.search('useStroe', {}, 5).map((hit) => hit.item.id)).toContain('sdk:useStore');
  });

  it('filters by package and kind before the limit', () => {
    const engine = new SymbolEngine(symbols, { ranking: ranking(), synonyms });
    expect(engine.search('EdgeLabel', { package: 'ui' }, 1).map((hit) => hit.item.id)).toEqual(['ui:EdgeLabel']);
    expect(engine.search('EdgeLabel', { kind: 'function' }, 5).map((hit) => hit.item.id)).toEqual(['sdk:EdgeLabel']);
    expect(engine.search('nodeTypes', { kind: 'property' }, 5)).toHaveLength(1);
  });

  it('searches the JSDoc prose after the first sentence but not its code examples', () => {
    const engine = new SymbolEngine(
      [
        symbol('sdk', 'useActions', {
          summary: 'Returns action callbacks.',
          description: 'Returns action callbacks.\n\nUse it from a custom toolbar.\n\n```tsx\nconst palette = 1;\n```',
        }),
      ],
      { ranking: ranking(), synonyms },
    );
    expect(engine.search('toolbar', {}, 5).map((hit) => hit.item.id)).toEqual(['sdk:useActions']);
    expect(engine.search('palette', {}, 5)).toEqual([]);
  });

  it("describes an undocumented component by its props type's JSDoc", () => {
    const member = {
      id: 'ui:ToggleProps.icon',
      name: 'icon',
      kind: 'property' as const,
      package: 'ui',
      parent: 'ToggleProps',
      importPath: '@scope/ui',
      signature: 'icon: ReactNode',
      description: '',
      summary: 'Shown in the off state.',
    };
    const engine = new SymbolEngine(
      [
        symbol('ui', 'Toggle', { kind: 'function' }),
        symbol('ui', 'Documented', { kind: 'function', summary: 'Documented.', description: 'Documented.' }),
        symbol('ui', 'ToggleProps', { members: [member] }),
        symbol('ui', 'DocumentedProps', {
          members: [{ ...member, id: 'ui:DocumentedProps.icon', parent: 'DocumentedProps' }],
        }),
      ],
      { ranking: ranking(), synonyms },
    );
    const ids = engine.search('off state', {}, 10).map((hit) => hit.item.id);
    expect(ids).toContain('ui:Toggle');
    expect(ids).not.toContain('ui:Documented');
  });

  it('breaks ties by id', () => {
    const engine = new SymbolEngine(symbols, { ranking: ranking(), synonyms });
    expect(engine.search('EdgeLabel', {}, 5).map((hit) => hit.item.id)).toEqual(['sdk:EdgeLabel', 'ui:EdgeLabel']);
  });

  it('applies memberBoost', () => {
    const engine = new SymbolEngine(symbols, { ranking: ranking({ memberBoost: 0.1 }), synonyms });
    const scores = new Map(engine.search('nodeTypes', {}, 5).map((hit) => [hit.item.id, hit.score]));
    const neutral = new SymbolEngine(symbols, { ranking: ranking(), synonyms });
    const base = new Map(neutral.search('nodeTypes', {}, 5).map((hit) => [hit.item.id, hit.score]));
    expect(scores.get('sdk:WorkflowBuilderRootProps.nodeTypes')).toBeLessThan(
      base.get('sdk:WorkflowBuilderRootProps.nodeTypes') ?? 0,
    );
  });

  it('boosts the package a query word names instead of matching the word as text', () => {
    const engine = new SymbolEngine(
      [
        symbol('temporal', 'TemporalEngine', { summary: 'Starts runs.' }),
        symbol('temporal', 'Store', { summary: 'Persists state.' }),
        symbol('sdk', 'useState', { summary: 'Reads state, the state of the editor state.' }),
      ],
      { ranking: ranking({ packageWords: { temporal: 'temporal' } }), synonyms },
    );
    const ids = engine.search('Temporal state', {}, 5).map((hit) => hit.item.id);
    expect(ids).toHaveLength(2);
    expect(ids).not.toContain('temporal:TemporalEngine');
    const score = (boost: number) =>
      new SymbolEngine([symbol('temporal', 'Store', { summary: 'Persists state.' })], {
        ranking: ranking({ packageBoost: boost, packageWords: { temporal: 'temporal' } }),
        synonyms,
      }).search('Temporal state', {}, 5)[0].score;
    expect(score(5) / score(1)).toBeCloseTo(5);
    expect(engine.search('temporal', {}, 5).map((hit) => hit.item.id)).toEqual(['temporal:TemporalEngine']);
  });

  it('selects a package only by a whole phrase that names it', () => {
    const engine = new SymbolEngine(
      [
        symbol('ui', 'Modal', { summary: 'A dialog.' }),
        symbol('sdk', 'openModal', { summary: 'Opens a modal dialog with a UI schema.' }),
      ],
      { ranking: ranking({ packageWords: { 'ui library': 'ui' } }), synonyms },
    );
    expect(engine.search('modal dialog from the UI library', {}, 5)[0].item.id).toBe('ui:Modal');
    expect(engine.search('modal dialog with a UI schema', {}, 5)[0].item.id).toBe('sdk:openModal');
  });

  it('keeps hits for the rest of the query when no symbol of the named package matches it', () => {
    const engine = new SymbolEngine(
      [
        symbol('temporal', 'TemporalEngine', { summary: 'Starts runs.' }),
        symbol('sdk', 'NamespaceHelper', { summary: 'Resolves a namespace.' }),
      ],
      { ranking: ranking({ packageWords: { temporal: 'temporal' } }), synonyms },
    );
    const ids = engine.search('temporal namespace', {}, 5).map((hit) => hit.item.id);
    expect(ids).toEqual(expect.arrayContaining(['temporal:TemporalEngine', 'sdk:NamespaceHelper']));
    expect(engine.search('temporal worker', {}, 5).map((hit) => hit.item.id)).toEqual(['temporal:TemporalEngine']);
  });

  it('answers a query that is only a package phrase from that package', () => {
    const engine = new SymbolEngine(
      [symbol('ui', 'UiButton', { summary: 'A ui button.' }), symbol('sdk', 'Other', { summary: 'Library helper.' })],
      { ranking: ranking({ packageWords: { 'ui library': 'ui' } }), synonyms },
    );
    expect(engine.search('ui library', {}, 5).map((hit) => hit.item.id)).toEqual(['ui:UiButton']);
  });

  it('boosts the named package without outranking a much stronger match elsewhere', () => {
    const engine = new SymbolEngine(
      [
        symbol('ui', 'Accordion', { summary: 'A theme-aware accordion.' }),
        symbol('sdk', 'Theme', { summary: 'The editor theme.' }),
      ],
      { ranking: ranking({ packageWords: { 'ui library': 'ui' } }), synonyms },
    );
    expect(engine.search('ui library theme', {}, 5)[0].item.id).toBe('sdk:Theme');
  });

  it('returns nothing for a blank query', () => {
    const engine = new SymbolEngine(symbols, { ranking: ranking(), synonyms });
    expect(engine.search('  ', {}, 5)).toEqual([]);
  });
});

describe('SymbolEngine resolve', () => {
  const engine = new SymbolEngine(symbols, { ranking: ranking(), synonyms });

  it('resolves ids and member ids', () => {
    expect(engine.resolve('sdk:useStore')).toMatchObject({ found: { id: 'sdk:useStore' } });
    expect(engine.resolve('sdk:WorkflowBuilderRootProps.nodeTypes')).toMatchObject({ found: { name: 'nodeTypes' } });
  });

  it('resolves a unique bare name, also case-insensitively and as Parent.member', () => {
    expect(engine.resolve('useStore')).toMatchObject({ found: { id: 'sdk:useStore' } });
    expect(engine.resolve('usestore')).toMatchObject({ found: { id: 'sdk:useStore' } });
    expect(engine.resolve('WorkflowBuilderRootProps.nodeTypes')).toMatchObject({ found: { name: 'nodeTypes' } });
  });

  it('reports ambiguous and missing names', () => {
    expect(engine.resolve('EdgeLabel')).toEqual({ ambiguous: ['sdk:EdgeLabel', 'ui:EdgeLabel'] });
    expect(engine.resolve('Nope')).toEqual({ missing: true });
    expect(engine.resolve('sdk:Nope')).toEqual({ missing: true });
    expect(engine.resolve('WorkflowBuilderRootProps.nope')).toEqual({ missing: true });
  });

  it('counts members', () => {
    expect(engine.memberCount).toBe(1);
  });
});
