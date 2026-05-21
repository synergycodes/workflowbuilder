import { INNER_HANDLE_MARKER } from './types';

export function isInnerHandle(handle: string | null): boolean {
  return handle ? handle.includes(INNER_HANDLE_MARKER) : false;
}
