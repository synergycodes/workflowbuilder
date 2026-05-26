import type { AuthPort, CallerIdentity } from './auth-port';

/**
 * Default {@link AuthPort} for the reference backend: permits every action,
 * for every caller. Useful for local development; **never** for production.
 *
 * `identify` returns `null` (anonymous), consistent with the port's design
 * note. `authorize` ignores the caller and returns `true`, so the middleware
 * never reaches its 401 branch with this port. Swap in a real port and the
 * 401/403 distinction starts behaving the way the contract describes.
 *
 * The constructor enforces two operator-facing safeties, both tied to the
 * port itself (swapping in a real port disables them automatically):
 *
 *   1. **Explicit opt-in.** Refuses to boot unless `WB_AUTH_PORT=allow-all`
 *      is set. This is the default-secure posture: if the env var is missing
 *      (forgotten in CI, dropped in a deploy template), the process fails
 *      loudly instead of starting wide-open. There is no "wide everywhere
 *      except production" heuristic that a misconfigured `NODE_ENV` can
 *      silently break.
 *   2. **Loud startup warning.** Even when the opt-in is present, the
 *      banner is unmistakable in operator logs so the permissive default
 *      cannot go unnoticed.
 */
export class AllowAllAuthPort implements AuthPort {
  constructor() {
    if (process.env['WB_AUTH_PORT'] !== 'allow-all') {
      throw new Error(
        'Refusing to boot: AllowAllAuthPort requires explicit opt-in. ' +
          'Set WB_AUTH_PORT=allow-all for local development, or wire a real AuthPort in server.ts. ' +
          'See: apps/backend/auth-port.decision-log.md',
      );
    }
    printPermissiveDefaultWarning();
  }

  // Method signatures omit parameters: TypeScript's contravariant arg
  // matching accepts a zero-arg method against the interface's 1- and
  // 3-arg signatures, and the project lint config does not honor the
  // underscore-prefix escape hatch for unused-vars. The interface in
  // `auth-port.ts` is the load-bearing contract; this port simply ignores
  // every input by construction.
  async identify(): Promise<CallerIdentity | null> {
    return null;
  }

  async authorize(): Promise<boolean> {
    return true;
  }
}

function printPermissiveDefaultWarning(): void {
  const bar = '!'.repeat(72);
  console.warn(bar);
  console.warn('!! AuthPort: AllowAllAuthPort (permissive default) is active.');
  console.warn('!! Every request - read, write, publish, execute, cancel - is allowed.');
  console.warn('!! Replace with a real AuthPort before exposing this backend to anyone.');
  console.warn('!! See: apps/backend/auth-port.decision-log.md');
  console.warn(bar);
}
