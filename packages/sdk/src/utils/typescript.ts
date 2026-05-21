/**
 * Forces TypeScript to flatten an intersection / mapped type into a
 * single object literal. Doesn't change semantics — only what TS shows
 * in tooltips and error messages.
 *
 * @category Utilities
 */
export type Prettify<T> = {
  [K in keyof T]: T[K];
} & {};

/**
 * Recursive `Partial<T>`: every nested object property becomes optional
 * all the way down. Use it when a value is built up incrementally and
 * intermediate states are never fully populated.
 *
 * @category Utilities
 */
export type DeepPartial<T> = T extends object
  ? {
      [P in keyof T]?: DeepPartial<T[P]>;
    }
  : T;

export type ExclusiveUnion<T, U> =
  | (T & { [K in Exclude<keyof U, keyof T>]?: never })
  | (U & { [K in Exclude<keyof T, keyof U>]?: never });
