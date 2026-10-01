/** Why the address did not open. `AppBoundary` shows the message and picks the way out by `what`. */
export class OpenError extends Error {
  readonly what: 'run' | 'workflow';

  constructor(what: 'run' | 'workflow', reason: string) {
    super(`The ${what} in the link could not be opened: ${reason}.`);
    this.name = 'OpenError';
    this.what = what;
  }
}
