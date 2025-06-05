import { PrimitiveFieldType } from '@workflow-builder/types/node-schema';

type TypeMap = {
  string: string;
  number: number;
  boolean: boolean;
};

type Convert<T> = T extends PrimitiveFieldType ? TypeMap[T] : unknown;

type ExtractProperties<T> = T extends { type: 'object'; properties: infer P }
  ? { [K in keyof P]: ExtractProperties<P[K]> }
  : T extends { type: 'array'; items: infer I }
    ? ExtractProperties<I>[]
    : T extends { type: infer X }
      ? Convert<X>
      : unknown;

type MakePropertiesOptional<T> = {
  [K in keyof T]?: T[K];
};

export type NodeDataProperties<T> = MakePropertiesOptional<ExtractProperties<T>>;
