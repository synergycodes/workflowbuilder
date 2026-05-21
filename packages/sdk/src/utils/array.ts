/*
    [1, 2, undefined, 3, 4].filter(Boolean) => (number | undefined)[]
    [1, 2, undefined, 3, 4].filter(filterTruthy) => number[]
*/
type Truthy<T> = T extends false | '' | 0 | null | undefined ? never : T; // from lodash

export function filterEmpty<T>(value: T): value is Truthy<T> {
  return !!value;
}
