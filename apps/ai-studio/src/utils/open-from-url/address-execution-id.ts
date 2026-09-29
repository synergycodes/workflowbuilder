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

/** A full reload: the editor fixes its diagram at mount, so the local draft or the address's workflow needs one. */
export function leaveRunView(): void {
  globalThis.location.assign(withExecutionId(globalThis.location.href, null));
}

export function syncExecutionIdToAddress(executionId: string | null): void {
  const next = withExecutionId(globalThis.location.href, executionId);
  if (next !== globalThis.location.href) {
    globalThis.history.replaceState(globalThis.history.state, '', next);
  }
}
