import { inlineConstTupleIndexes } from './const-tuples.js';
import { typeToString } from './type-printer.js';
import type { TypedocReflection, TypedocType } from './typedoc-types.js';

const SIZES: TypedocReflection = {
  id: 2,
  name: 'SIZES',
  kind: 32,
  flags: { isConst: true },
  type: {
    type: 'typeOperator',
    operator: 'readonly',
    target: {
      type: 'tuple',
      elements: [
        { type: 'literal', value: 's' },
        { type: 'literal', value: 'm' },
      ],
    },
  } as TypedocType,
};

function tupleIndex(target: TypedocType['target']): TypedocType {
  return {
    type: 'indexedAccess',
    indexType: { type: 'intrinsic', name: 'number' },
    objectType: { type: 'query', queryType: { type: 'reference', name: 'X', target } },
  };
}

function project(type: TypedocType, extra: TypedocReflection[] = []): TypedocReflection {
  return { id: 0, name: 'pkg', kind: 1, children: [{ id: 1, name: 'Alias', kind: 2_097_152, type }, ...extra] };
}

const noValues = (): undefined => {};
const aliasType = (root: TypedocReflection) => typeToString(root.children?.[0].type);
const external = { packageName: '@scope/types', packagePath: 'src/model.ts', qualifiedName: 'POLICIES' };

describe('inlineConstTupleIndexes', () => {
  it('turns typeof a tuple in the same project into its literal union', () => {
    const root = project(tupleIndex(2), [SIZES]);
    expect(inlineConstTupleIndexes(root, noValues)).toBe(1);
    expect(aliasType(root)).toBe("'s' | 'm'");
  });

  it('asks for the values of a tuple declared in another package', () => {
    const asked: unknown[] = [];
    const root = project(tupleIndex(external));
    inlineConstTupleIndexes(root, (target) => {
      asked.push(target);
      return ['fail', 'continue'];
    });
    expect(asked).toEqual([external]);
    expect(aliasType(root)).toBe("'fail' | 'continue'");
  });

  it('rewrites nested occurrences, such as a member type', () => {
    const member: TypedocReflection = { id: 3, name: 'size', kind: 1024, type: tupleIndex(2) };
    const root = project(
      { type: 'reflection', declaration: { id: 4, name: '__type', kind: 65_536, children: [member] } },
      [SIZES],
    );
    expect(inlineConstTupleIndexes(root, noValues)).toBe(1);
    expect(typeToString(member.type)).toBe("'s' | 'm'");
  });

  it('prints a one-element tuple as a single literal', () => {
    const root = project(tupleIndex(external));
    inlineConstTupleIndexes(root, () => [42]);
    expect(aliasType(root)).toBe('42');
  });

  it('leaves the query when the values are unknown', () => {
    const root = project(tupleIndex(external));
    expect(inlineConstTupleIndexes(root, noValues)).toBe(0);
    expect(aliasType(root)).toBe('typeof X[number]');
  });

  it('leaves a tuple with a non-literal element', () => {
    const mixed: TypedocReflection = {
      ...SIZES,
      type: {
        type: 'tuple',
        elements: [
          { type: 'literal', value: 's' },
          { type: 'intrinsic', name: 'string' },
        ],
      },
    };
    const root = project(tupleIndex(2), [mixed]);
    expect(inlineConstTupleIndexes(root, noValues)).toBe(0);
  });

  it('leaves an index other than number', () => {
    const root = project({ ...tupleIndex(2), indexType: { type: 'literal', value: 0 } }, [SIZES]);
    expect(inlineConstTupleIndexes(root, noValues)).toBe(0);
  });
});
