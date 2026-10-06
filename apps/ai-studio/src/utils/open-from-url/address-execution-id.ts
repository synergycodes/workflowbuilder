const PARAMETER = 'executionId';

export function withExecutionId(href: string, executionId: string | null): string {
  const url = new URL(href);
  const current = url.searchParams.get(PARAMETER);
  if (current === executionId) return href;

  if (executionId === null) {
    url.searchParams.delete(PARAMETER);
  } else {
    url.searchParams.set(PARAMETER, executionId);
  }
  return url.toString();
}

/** A full reload: the editor fixes its diagram at mount. `reload`, as assigning the same URL with a fragment loads nothing. */
export function leaveRunView(): void {
  syncExecutionIdToAddress(null);
  globalThis.location.reload();
}

export function syncExecutionIdToAddress(executionId: string | null): void {
  const next = withExecutionId(globalThis.location.href, executionId);
  if (next !== globalThis.location.href) {
    globalThis.history.replaceState(globalThis.history.state, '', next);
  }
}
