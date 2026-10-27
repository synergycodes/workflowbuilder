import type { SourceHandleType } from '@workflow-builder/types/variables/node-output-schema';

const ALL_SOURCE_HANDLE_TYPES: Record<SourceHandleType, true> = {
  success: true,
  error: true,
  settled: true,
};

/**
 * Exact match on a bucket key of `bySourceHandleType`. Unlike the `error` bucket lookup, this is not a substring match.
 */
export function getIsSourceHandleType(value: unknown): value is SourceHandleType {
  return typeof value === 'string' && Object.hasOwn(ALL_SOURCE_HANDLE_TYPES, value);
}
