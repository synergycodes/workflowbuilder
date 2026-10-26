import { declarationSignature, typeToString } from './type-printer.js';
import { ReflectionKind, type TypedocReflection, type TypedocType } from './typedoc-types.js';

const string_: TypedocType = { type: 'intrinsic', name: 'string' };
const number_: TypedocType = { type: 'intrinsic', name: 'number' };

describe('typeToString', () => {
  it('prints intrinsics, literals and references with arguments', () => {
    expect(typeToString(string_)).toBe('string');
    expect(typeToString({ type: 'literal', value: 'a' })).toBe("'a'");
    expect(typeToString({ type: 'literal', value: 3 })).toBe('3');
    expect(typeToString({ type: 'literal', value: null })).toBe('null');
    expect(typeToString({ type: 'reference', name: 'Array', typeArguments: [number_] })).toBe('Array<number>');
  });

  it('prints unions, intersections, arrays and tuples', () => {
    expect(typeToString({ type: 'union', types: [string_, number_] })).toBe('string | number');
    expect(typeToString({ type: 'intersection', types: [string_, number_] })).toBe('string & number');
    expect(typeToString({ type: 'array', elementType: { type: 'union', types: [string_, number_] } })).toBe(
      '(string | number)[]',
    );
    expect(typeToString({ type: 'tuple', elements: [string_, number_] })).toBe('[string, number]');
  });

  it('prints function types and object types', () => {
    const signature: TypedocReflection = {
      id: 2,
      name: '__type',
      kind: ReflectionKind.Function,
      parameters: [{ id: 3, name: 'x', kind: 32_768, type: string_ }],
      type: number_,
    };
    expect(
      typeToString({
        type: 'reflection',
        declaration: { id: 1, name: '__type', kind: 65_536, signatures: [signature] },
      }),
    ).toBe('(x: string) => number');
    const member: TypedocReflection = {
      id: 4,
      name: 'a',
      kind: ReflectionKind.Property,
      flags: { isOptional: true },
      type: string_,
    };
    expect(
      typeToString({ type: 'reflection', declaration: { id: 5, name: '__type', kind: 65_536, children: [member] } }),
    ).toBe('{ a?: string }');
  });

  it('prints indexed access, operators, queries and template literals', () => {
    expect(
      typeToString({
        type: 'indexedAccess',
        objectType: { type: 'reference', name: 'T' },
        indexType: { type: 'literal', value: 'k' },
      }),
    ).toBe("T['k']");
    expect(
      typeToString({ type: 'typeOperator', operator: 'keyof', target: { type: 'reference', name: 'T' } as never }),
    ).toBe('keyof T');
    expect(typeToString({ type: 'query', queryType: { type: 'reference', name: 'value' } })).toBe('typeof value');
    expect(typeToString({ type: 'templateLiteral', head: 'a-', tail: [[string_, '']] })).toBe('`a-${string}`');
  });

  it('caps the nesting depth', () => {
    let nested: TypedocType = string_;
    for (let index = 0; index < 10; index += 1) nested = { type: 'array', elementType: nested };
    expect(typeToString(nested)).toContain('unknown');
  });
});

describe('declarationSignature', () => {
  it('prints an empty class and a const', () => {
    expect(declarationSignature({ id: 1, name: 'Empty', kind: ReflectionKind.Class })).toBe('class Empty {}');
    expect(declarationSignature({ id: 2, name: 'value', kind: ReflectionKind.Variable, type: string_ })).toBe(
      'const value: string',
    );
  });

  it('prints a type alias with type parameters', () => {
    const declaration: TypedocReflection = {
      id: 3,
      name: 'Box',
      kind: ReflectionKind.TypeAlias,
      typeParameters: [{ name: 'T', type: string_, default: string_ }],
      type: { type: 'array', elementType: { type: 'reference', name: 'T' } },
    };
    expect(declarationSignature(declaration)).toBe('type Box<T extends string = string> = T[]');
  });
});
