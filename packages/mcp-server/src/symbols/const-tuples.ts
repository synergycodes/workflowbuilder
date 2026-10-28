import { walk } from './referenced-types.js';
import type { TypedocExternalTarget, TypedocReflection, TypedocType } from './typedoc-types.js';

export type LiteralValue = string | number | boolean;

// Values of an `as const` tuple TypeDoc cannot see, such as one declared in another workspace package.
export type ExternalTupleValues = (target: Required<TypedocExternalTarget>) => readonly LiteralValue[] | undefined;

function literalValues(type: TypedocType | undefined): LiteralValue[] | undefined {
  const tuple = type?.type === 'typeOperator' && type.operator === 'readonly' ? (type.target as TypedocType) : type;
  if (tuple?.type !== 'tuple' || !tuple.elements?.length) return;
  const values: LiteralValue[] = [];
  for (const element of tuple.elements) {
    if (element.type !== 'literal' || element.value === null || element.value === undefined) return;
    values.push(element.value);
  }
  return values;
}

// `typeof X[number]` names the tuple, not the values an agent has to pass, so it becomes their literal union.
// Returns how many types were rewritten; the project is changed in place.
export function inlineConstTupleIndexes(project: TypedocReflection, externalValues: ExternalTupleValues) {
  const byId = new Map<number, TypedocReflection>();
  walk(project, (object) => {
    if (typeof object.id === 'number' && typeof object.name === 'string') {
      byId.set(object.id, object as unknown as TypedocReflection);
    }
  });

  let rewritten = 0;
  walk(project, (object) => {
    const type = object as unknown as TypedocType;
    if (type.type !== 'indexedAccess' || type.indexType?.type !== 'intrinsic' || type.indexType.name !== 'number') {
      return;
    }
    if (type.objectType?.type !== 'query' || type.objectType.queryType?.type !== 'reference') return;
    const target = type.objectType.queryType.target;
    let values: readonly LiteralValue[] | undefined;
    if (typeof target === 'number') values = literalValues(byId.get(target)?.type);
    else if (target?.packageName && target.packagePath && target.qualifiedName) {
      values = externalValues(target as Required<TypedocExternalTarget>);
    }
    if (!values?.length) return;

    const literals = [...new Set(values)].map((value): TypedocType => ({ type: 'literal', value }));
    for (const key of Object.keys(object)) delete object[key];
    Object.assign(object, literals.length === 1 ? literals[0] : { type: 'union', types: literals });
    rewritten++;
  });
  return rewritten;
}
