import { fixtureExtractInput } from '../__fixtures__/fixtures.js';
import { type ApiSymbol, extractSymbols, firstSentence } from './extract-symbols.js';

async function load(name: 'alpha' | 'beta' | 'multi', packageName: string = name) {
  const symbols = extractSymbols(await fixtureExtractInput(name, packageName));
  return { symbols, byName: new Map(symbols.map((symbol) => [symbol.name, symbol])) };
}

function get(byName: Map<string, ApiSymbol>, name: string) {
  const symbol = byName.get(name);
  if (!symbol) throw new Error(`Missing symbol ${name}`);
  return symbol;
}

describe('ids, kinds and imports', () => {
  it('builds package-prefixed ids sorted by id', async () => {
    const { symbols } = await load('alpha', 'sdk');
    const ids = symbols.map((symbol) => symbol.id);
    expect(ids).toContain('sdk:WidgetProps');
    expect(ids).toEqual([...ids].sort());
  });

  it('keeps the same name in two packages as distinct ids', async () => {
    const alpha = await load('alpha');
    const beta = await load('beta');
    expect(get(alpha.byName, 'Shared')).toMatchObject({ id: 'alpha:Shared', kind: 'function' });
    expect(get(beta.byName, 'Shared')).toMatchObject({ id: 'beta:Shared', kind: 'const' });
  });

  it('merges a value and a type with the same name into one value entry', async () => {
    const { symbols, byName } = await load('alpha');
    expect(symbols.filter((symbol) => symbol.name === 'Mode')).toHaveLength(1);
    const mode = get(byName, 'Mode');
    expect(mode.kind).toBe('const');
    expect(mode.typeOnly).toBe(false);
    expect(mode.signature.split('\n')).toHaveLength(2);
    expect(mode.signature).toContain('type Mode =');
  });

  it('marks interfaces and type aliases as type only', async () => {
    const { byName } = await load('alpha');
    expect(get(byName, 'WidgetProps')).toMatchObject({ kind: 'interface', typeOnly: true });
    expect(get(byName, 'WrappedProps')).toMatchObject({ kind: 'type', typeOnly: true });
    expect(get(byName, 'Engine').typeOnly).toBe(false);
  });

  it('prints one signature line per overload', async () => {
    const { byName } = await load('alpha');
    expect(get(byName, 'overloaded').signature).toBe(
      'function overloaded(a: string): string\nfunction overloaded(a: number): number',
    );
  });

  it('prints each declaration form', async () => {
    const { byName } = await load('alpha');
    expect(get(byName, 'createWidget').signature).toBe(
      'function createWidget<T extends WidgetProps>(props: T, flag?: boolean): T',
    );
    expect(get(byName, 'Engine').signature).toBe(
      'class Engine { constructor(options: { speed: number }); name: string; start(times: number): Promise<void> }',
    );
    expect(get(byName, 'Color').signature).toBe("enum Color { Red = 'red', Blue = 'blue' }");
    expect(get(byName, 'WidgetProps').signature).toBe(
      'interface WidgetProps { title: string; width?: number; onClick(event: string): void }',
    );
  });

  it('leaves out internal exports', async () => {
    const { byName } = await load('alpha');
    expect(byName.has('hidden')).toBe(false);
    expect(get(byName, 'WidgetProps').members.map((member) => member.name)).not.toContain('secret');
  });
});

describe('documentation fields', () => {
  it('reads description, summary, category, since and deprecation', async () => {
    const { byName } = await load('alpha');
    const widget = get(byName, 'WidgetProps');
    expect(widget.summary).toBe('Props accepted by the widget.');
    expect(widget.description).toContain('Extra remarks text.');
    expect(widget.category).toBe('Core');
    expect(widget.since).toBe('1.2.0');
    expect(get(byName, 'createWidget').deprecated).toBe('Use createWidget2.');
    expect(get(byName, 'documented').deprecated).toBeUndefined();
  });

  it('keeps inline code backticks and reduces links to their text', () => {
    expect(firstSentence('First sentence. Second sentence.')).toBe('First sentence.');
    expect(firstSentence('Props for `<Root>`. More.')).toBe('Props for `<Root>`.');
    expect(firstSentence('Line one\nstill one. Next.')).toBe('Line one still one.');
  });

  it('builds a docs url only for sdk symbols with a category and a comment', async () => {
    const sdk = await load('alpha', 'sdk');
    expect(get(sdk.byName, 'WidgetProps').url).toBe('https://www.workflowbuilder.io/docs/api/core/widgetprops/');
    expect(get(sdk.byName, 'documented').url).toBeUndefined();
    const other = await load('alpha', 'ui');
    expect(get(other.byName, 'WidgetProps').url).toBeUndefined();
  });

  it('reports the source as a repo path and line', async () => {
    const { byName } = await load('alpha');
    expect(get(byName, 'WidgetProps').source).toBe('src/alpha/index.ts:10');
  });

  it('links ui symbols to the pages that document their props', async () => {
    const input = await fixtureExtractInput('beta', 'ui');
    const symbols = extractSymbols(input, { docsBySymbolName: new Map([['ButtonProps', ['ui-library/button']]]) });
    expect(symbols.find((symbol) => symbol.name === 'ButtonProps')?.docs).toEqual(['ui-library/button']);
    expect(symbols.find((symbol) => symbol.name === 'Shared')?.docs).toBeUndefined();
  });
});

describe('members', () => {
  it('collects interface members with ids, kinds, defaults and summaries', async () => {
    const { byName } = await load('alpha');
    const { members } = get(byName, 'WidgetProps');
    expect(members.map((member) => member.id)).toEqual([
      'alpha:WidgetProps.title',
      'alpha:WidgetProps.width',
      'alpha:WidgetProps.onClick',
    ]);
    const width = members.find((member) => member.name === 'width');
    expect(width).toMatchObject({
      kind: 'property',
      signature: 'width?: number',
      defaultValue: '100',
      parent: 'WidgetProps',
    });
    expect(members.find((member) => member.name === 'onClick')).toMatchObject({
      kind: 'method',
      signature: 'onClick(event: string): void',
    });
  });

  it('finds members behind a generic wrapper through its type arguments', async () => {
    const { byName } = await load('alpha');
    const { members } = get(byName, 'WrappedProps');
    expect(members.map((member) => member.signature)).toEqual(['a?: string', 'b: number']);
    expect(members[0].summary).toBe('Optional label.');
  });

  it('applies Omit keys to first-party types', async () => {
    const { byName } = await load('alpha');
    expect(get(byName, 'SlimProps').members.map((member) => member.name)).toEqual(['title', 'width']);
  });

  it('lists class members without the constructor', async () => {
    const { byName } = await load('alpha');
    expect(get(byName, 'Engine').members.map((member) => member.name)).toEqual(['name', 'start']);
  });

  it('does not list enum members as entries', async () => {
    const { byName } = await load('alpha');
    expect(get(byName, 'Color').members).toEqual([]);
  });
});

describe('modules', () => {
  it('uses the first module in the map as import path and the others as alternatives', async () => {
    const { byName } = await load('multi');
    expect(get(byName, 'Core')).toMatchObject({
      importPath: 'fixture-multi',
      otherImportPaths: ['fixture-multi/client', 'fixture-multi/workflow'],
    });
    expect(get(byName, 'ClientThing')).toMatchObject({ importPath: 'fixture-multi/client' });
    expect(get(byName, 'flow').otherImportPaths).toBeUndefined();
  });

  it('produces one entry per re-exported symbol', async () => {
    const { symbols } = await load('multi');
    expect(symbols.filter((symbol) => symbol.name === 'Core')).toHaveLength(1);
    expect(symbols.map((symbol) => symbol.name).sort()).toEqual(['ClientThing', 'Core', 'CoreOptions', 'flow']);
  });

  it('keeps type-only re-exports type only', async () => {
    const { byName } = await load('multi');
    expect(get(byName, 'CoreOptions')).toMatchObject({ typeOnly: true, importPath: 'fixture-multi' });
  });
});

const memberOf = (symbol: ApiSymbol, name: string) => {
  const member = symbol.members.find((candidate) => candidate.name === name);
  if (!member) throw new Error(`Missing member ${name}`);
  return member;
};

describe('union members and utility flags', () => {
  it('builds a member from every variant of a union', async () => {
    const { byName } = await load('alpha');
    const strategy = get(byName, 'Strategy');
    expect(memberOf(strategy, 'strategy').signature).toBe("strategy: 'local' | 'api' | 'props'");
    expect(memberOf(strategy, 'error').signature).toBe('error?: { code: number } | undefined');
    expect(memberOf(strategy, 'label').signature).toBe('label?: string');
  });

  it('clears optional for Required and sets readonly for Readonly', async () => {
    const { byName } = await load('alpha');
    expect(memberOf(get(byName, 'StrictOptions'), 'label').signature).toBe('label: string');
    expect(memberOf(get(byName, 'FrozenOptions'), 'count').signature).toBe('readonly count?: number');
  });
});
