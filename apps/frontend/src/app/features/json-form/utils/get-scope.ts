/*
 * A helper method to simplify defining JSON Forms scope paths.
 * Reference: https://jsonforms.io/docs/uischema/controls/#scope-string
 *
 * Usage:
 * getScope<typeof schema>("properties.label")
 *
 * Returns:
 * '#/properties/label'
 */
export function getScope<T extends object>(path: PropertyPath<T> | ''): string {
  return `#/${path.split('.').join('/')}`;
}

// Get all possible paths in an object type, treating arrays as terminal properties
type PropertyPath<T> = T extends object
  ? {
      [K in keyof T]: K extends string
        ? T[K] extends Array<unknown>
          ? // If property is an array, it's a terminal path
            K
          : T[K] extends object
            ? // If property is an object, allow deeper paths
              K | `${K}.${PropertyPath<T[K]>}`
            : // Otherwise it's a terminal path
              K
        : never;
    }[keyof T]
  : never;
