// `sourceHandle` reserved for the 'errorRoute' error policy, named after it. Edges tagged
// with it fire only when the source failed under that policy; every other route prunes them.
export const RESERVED_ERROR_HANDLE = 'errorRoute';

/**
 * Whether a run that left a finished node with `nextPort` went through the edge with
 * `sourceHandle`. Error routing takes only the error edges; otherwise error edges are
 * pruned and an edge is taken when there is no `nextPort` or its handle matches it.
 * The graph runner routes by it, and a client reads travelled edges from it.
 */
export function isPortRouted(nextPort: string | undefined, sourceHandle: string | null | undefined): boolean {
  const isErrorEdge = sourceHandle === RESERVED_ERROR_HANDLE;
  if (nextPort === RESERVED_ERROR_HANDLE) return isErrorEdge;
  if (isErrorEdge) return false;
  return !nextPort || sourceHandle === nextPort;
}
