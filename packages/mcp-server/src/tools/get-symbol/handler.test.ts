import { buildFixtureCorpus } from '../../__fixtures__/fixtures.js';
import { budget as defaultBudget } from '../../config/budget.js';
import { createGetSymbolHandler } from './handler.js';

const corpus = await buildFixtureCorpus();
const handler = createGetSymbolHandler(corpus.symbols);

type Output = Record<string, unknown> & {
  members: { name: string; kind: string; signature: string; summary?: string; defaultValue?: string }[];
};

const names = (members: { name: string }[]) => members.map((member) => member.name);

describe('get_symbol', () => {
  it('returns the full entry with a type import statement', async () => {
    const output = (await handler({ name: 'sdk:WidgetProps' })) as Output;
    expect(output).toMatchObject({
      id: 'sdk:WidgetProps',
      kind: 'interface',
      package: 'sdk',
      importStatement: "import type { WidgetProps } from 'fixture-alpha';",
      category: 'Core',
      since: '1.2.0',
      source: 'src/alpha/index.ts:10',
      membersTruncated: 0,
    });
    expect(output.description).toContain('Extra remarks text.');
    expect(output.members.map((member) => member.name)).toEqual(['title', 'width', 'onClick']);
    expect(output.members[1]).toEqual({
      name: 'width',
      kind: 'property',
      signature: 'width?: number',
      summary: 'Maximum width in pixels.',
      defaultValue: '100',
    });
  });

  it('uses a value import for values', async () => {
    const output = (await handler({ name: 'sdk:Engine' })) as Output;
    expect(output.importStatement).toBe("import { Engine } from 'fixture-alpha';");
  });

  it('reports other import paths for re-exported symbols', async () => {
    const output = (await handler({ name: 'temporal:Core' })) as Output;
    expect(output.otherImportPaths).toEqual(['fixture-multi/client', 'fixture-multi/workflow']);
  });

  it('returns a member entry with the parent import statement', async () => {
    const output = await handler({ name: 'sdk:WidgetProps.width' });
    expect(output).toMatchObject({
      id: 'sdk:WidgetProps.width',
      kind: 'property',
      parent: 'WidgetProps',
      importStatement: "import type { WidgetProps } from 'fixture-alpha';",
      signature: 'width?: number',
      defaultValue: '100',
    });
  });

  it('resolves a bare name that only one package exports', async () => {
    expect(((await handler({ name: 'Engine' })) as Output).id).toBe('sdk:Engine');
    expect(((await handler({ name: 'WidgetProps.title' })) as { id: string }).id).toBe('sdk:WidgetProps.title');
  });

  it('reports an ambiguous bare name', async () => {
    await expect(handler({ name: 'Shared' })).rejects.toThrow('Ambiguous symbol "Shared": sdk:Shared, ui:Shared');
  });

  it('reports a missing symbol with suggestions', async () => {
    await expect(handler({ name: 'WidgetProp' })).rejects.toThrow(
      /^Symbol not found: WidgetProp\. Did you mean: sdk:WidgetProps/,
    );
    await expect(handler({ name: 'qqqzzz' })).rejects.toThrow(/^Symbol not found: qqqzzz$/);
  });

  it('omits members that do not fit the response budget and counts them', async () => {
    const tight = createGetSymbolHandler(corpus.symbols, {
      ...defaultBudget,
      getSymbol: { ...defaultBudget.getSymbol, maxResponseTokens: 150 },
    });
    const output = (await tight({ name: 'sdk:WidgetProps' })) as Output & { membersTruncated: number };
    expect(output.members.length + output.membersTruncated).toBe(3);
    expect(output.membersTruncated).toBeGreaterThan(0);
  });

  it('truncates a long description', async () => {
    const short = createGetSymbolHandler(corpus.symbols, {
      ...defaultBudget,
      getSymbol: { ...defaultBudget.getSymbol, maxDescriptionTokens: 5 },
    });
    expect(
      ((await short({ name: 'sdk:WidgetProps' })) as { description: string }).description.endsWith('…[truncated]'),
    ).toBe(true);
  });

  describe('unions and aliases', () => {
    type Variant = { name?: string; members: { name: string; signature: string }[] };

    it('splits an inline union into shared members and per-variant members', async () => {
      const output = (await handler({ name: 'sdk:Either' })) as Output & { variants: Variant[] };
      expect(names(output.members)).toEqual(['shared']);
      expect(output.variants.map((variant) => names(variant.members))).toEqual([
        ['kind', 'onlyA'],
        ['kind', 'onlyB'],
      ]);
      expect(output.variants[0].members[0].signature).toBe("kind: 'a'");
    });

    it('names the variants of a union of named types', async () => {
      const output = (await handler({ name: 'sdk:Named' })) as Output & { variants: Variant[] };
      expect(names(output.members)).toEqual(['id']);
      expect(output.variants.map((variant) => variant.name)).toEqual(['FirstShape', 'SecondShape']);
      expect(output.variants.map((variant) => names(variant.members))).toEqual([['first'], ['second']]);
    });

    it('omits variants for a plain object type', async () => {
      expect(await handler({ name: 'sdk:WidgetProps' })).not.toHaveProperty('variants');
    });

    it('expands an alias of a type the package does not export', async () => {
      const output = (await handler({ name: 'sdk:Aliased' })) as Output;
      expect(names(output.members)).toEqual(['name', 'size']);
    });

    it('serves the unexported type by name without an import statement', async () => {
      const output = (await handler({ name: 'HiddenOptions' })) as Output;
      expect(output).toMatchObject({ id: 'sdk:HiddenOptions', exported: false });
      expect(output).not.toHaveProperty('importStatement');
      expect(names(output.members)).toEqual(['name', 'size']);
      expect(await handler({ name: 'sdk:HiddenOptions.name' })).toMatchObject({
        parent: 'HiddenOptions',
        exported: false,
      });
    });

    it('keeps unexported types out of search', () => {
      expect(
        corpus.symbols.search('HiddenOptions', {}, 10).filter((hit) => hit.item.id.startsWith('sdk:HiddenOptions')),
      ).toEqual([]);
      expect(corpus.symbols.symbols.has('sdk:HiddenOptions')).toBe(false);
    });
  });

  describe('truncation signals', () => {
    it('flags a cut union signature with its size', async () => {
      const tight = createGetSymbolHandler(corpus.symbols, {
        ...defaultBudget,
        getSymbol: { ...defaultBudget.getSymbol, maxSignatureTokens: 5 },
      });
      const output = (await tight({ name: 'sdk:Letters' })) as {
        signature: string;
        truncated?: boolean;
        unionSize?: number;
      };
      expect(output.signature.endsWith('…')).toBe(true);
      expect(output).toMatchObject({ truncated: true, unionSize: 8 });
    });

    it('reports the member total when the budget omits members', async () => {
      const tight = createGetSymbolHandler(corpus.symbols, {
        ...defaultBudget,
        getSymbol: { ...defaultBudget.getSymbol, maxResponseTokens: 150 },
      });
      expect(await tight({ name: 'sdk:WidgetProps' })).toMatchObject({ truncated: true, memberCount: 3 });
    });

    it('flags a member whose summary was shortened', async () => {
      const tight = createGetSymbolHandler(corpus.symbols, {
        ...defaultBudget,
        getSymbol: { ...defaultBudget.getSymbol, maxMemberSummaryTokens: 2 },
      });
      const output = (await tight({ name: 'sdk:WidgetProps' })) as Output & { truncated?: boolean };
      expect(output.truncated).toBe(true);
      expect(output.members.find((member) => member.name === 'width')).toMatchObject({ truncated: true });
    });

    it('does not flag a complete answer', async () => {
      expect(await handler({ name: 'sdk:Either' })).not.toHaveProperty('truncated');
    });
  });

  describe('id forms', () => {
    it.each(['SDK:WidgetProps', 'sdk:widgetprops', 'sdk:WIDGETPROPS.WIDTH', 'widgetprops.Width'])(
      'resolves %s',
      async (name) => {
        const output = (await handler({ name })) as { id: string };
        expect(output.id).toMatch(/^sdk:WidgetProps(.width)?$/);
      },
    );

    it('resolves the compound notation Parent.Child to the symbol ParentChild', async () => {
      expect(((await handler({ name: 'Hidden.Options' })) as { id: string }).id).toBe('sdk:HiddenOptions');
      expect(((await handler({ name: 'sdk:Hidden.Options' })) as { id: string }).id).toBe('sdk:HiddenOptions');
    });

    it('does not resolve a prefix for another package', async () => {
      await expect(handler({ name: 'ui:WidgetProps' })).rejects.toThrow('Symbol not found');
    });
  });

  it.each([
    [{}, 'Name parameter is required'],
    [{ name: ' ' }, 'cannot be empty'],
    [{ name: 'a'.repeat(201) }, 'too long'],
  ])('rejects %j', async (input, message) => {
    await expect(handler(input)).rejects.toThrow(message);
  });
});
