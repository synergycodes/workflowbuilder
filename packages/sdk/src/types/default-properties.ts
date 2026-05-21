import type { PrimitiveFieldType } from '../node/node-schema';

type TypeMap = {
  string: string;
  number: number;
  boolean: boolean;
};

type Convert<T> = T extends PrimitiveFieldType ? TypeMap[T] : unknown;

// Match on `properties` alone — `NodeSchema`'s top level allows `type:
// 'object'` to be omitted, and the usual authoring pattern does omit it.
// Arrays carry `items` not `properties`, so they still fall through to
// the array branch.
type ExtractProperties<T> = T extends { properties: infer P }
  ? { [K in keyof P]: ExtractProperties<P[K]> }
  : T extends { type: 'array'; items: infer I }
    ? ExtractProperties<I>[]
    : T extends { type: infer X }
      ? Convert<X>
      : unknown;

type MakePropertiesOptional<T> = {
  [K in keyof T]?: T[K];
};

/**
 * Derives a TypeScript type for a node's `data.properties` directly from
 * its {@link NodeSchema}. Each property is optional (matching the
 * runtime, where partial form-state is normal).
 *
 * @example
 * ```ts
 * const schema = { type: 'object', properties: { count: { type: 'number' } } } as const;
 * type Props = NodeDataProperties<typeof schema>; // { count?: number }
 * ```
 *
 * @category Types
 */
export type NodeDataProperties<T> = MakePropertiesOptional<ExtractProperties<T>>;
