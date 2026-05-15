import type { AuthPort, CallerIdentity } from './auth-port';

/**
 * Default {@link AuthPort} for the reference backend: permits every action,
 * for every caller. Useful for local development; **never** for production.
 *
 * `identify` returns `null` (anonymous) — consistent with the port's design
 * note. `authorize` ignores the caller and returns `true`, so the middleware
 * never reaches its 401 branch with this port. Swap in a real port and the
 * 401/403 distinction starts behaving the way the contract describes.
 *
 * The constructor enforces two operator-facing safeties — refuses to boot
 * under `NODE_ENV=production` unless `WB_ALLOW_INSECURE=1` is set explicitly
 * (same posture as the `127.0.0.1` binding default in
 * `local-dev-binding.decision-log.md`), and emits a loud startup warning so
 * the permissive default cannot go unnoticed. Both safeties are tied to the
 * port itself: swapping in a real port disables them automatically, with
 * nothing to update in `server.ts`.
 */
export class AllowAllAuthPort implements AuthPort {
  constructor() {
    if (process.env['NODE_ENV'] === 'production' && process.env['WB_ALLOW_INSECURE'] !== '1') {
      throw new Error(
        'Refusing to boot: AllowAllAuthPort under NODE_ENV=production. ' +
          'Wire a real AuthPort, or set WB_ALLOW_INSECURE=1 to opt in deliberately.',
      );
    }
    printPermissiveDefaultWarning();
  }

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
  console.warn('!! Every request — read, write, publish, execute, cancel — is allowed.');
  console.warn('!! Replace with a real AuthPort before exposing this backend to anyone.');
  console.warn('!! See: apps/backend/auth-port.decision-log.md');
  console.warn(bar);
}
