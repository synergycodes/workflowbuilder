import { SOURCE_HANDLE_TYPE, type SourceHandleType } from '../../../../core-contract';

const SOURCE_HANDLE_TYPES = new Set<string>(Object.values(SOURCE_HANDLE_TYPE));

/**
 * Exact match on a bucket key of `bySourceHandleType`. Unlike the `error` bucket lookup, this is not a substring match.
 */
export function getIsSourceHandleType(value: unknown): value is SourceHandleType {
  return typeof value === 'string' && SOURCE_HANDLE_TYPES.has(value);
}
