### Title: AuthPort seam for backend authn/authz

### Proposed by: Kacper Cierzniewski

### Date: 15.05.2026

## Context

The reference backend (`apps/backend`) ships **without** authentication. CORS is wide open and any caller can create, read, publish, execute, and cancel workflows. This is deliberate: real authn/authz is consumer-specific — SSO, JWT, OAuth, custom — and the OSS package does not pick one.

This decision log records the structural piece (scope L from [`local-dev-binding.decision-log.md`](./local-dev-binding.decision-log.md)) that lets consumers plug in their own provider without forking the HTTP routes: introduce `AuthPort`, a Hono auth middleware, and a permissive default.

## Decision

1. Introduce `AuthPort` in `apps/backend/src/auth/auth-port.ts` with two methods:
   - `identify(request)` — resolve an incoming `Request` to a `CallerIdentity` or `null` (anonymous).
   - `authorize(caller, action, resource)` — return `true` if the caller may perform the action on the resource; `false` otherwise. Throwing is reserved for unexpected failures (e.g. the IdP is down).
2. Wire HTTP routes through a Hono middleware (`createAuthMiddleware`) that calls `identify` once per request and stashes the caller on `c.var.caller`. Boot code binds the port to an `Authorize` function via `makeAuthorize(port)` and passes it to each route factory; handlers call `authorize` before sensitive operations.
3. Ship `AllowAllAuthPort` as the permissive default for local development. It returns `null` from `identify` (consistent with the design note "Return null when anonymous") and `true` from `authorize` — together they short-circuit the 401/403 paths so the middleware never denies anything until a real port replaces it.
4. Emit a loud, unmissable startup warning whenever `AllowAllAuthPort` is active. Boot code refuses to start under `NODE_ENV=production` unless the operator opts in with `WB_ALLOW_INSECURE=1` — the same posture as the `127.0.0.1` binding default.

## Actions covered today

| Action              | Resource                             |
| ------------------- | ------------------------------------ |
| `workflows:create`  | `{ kind: 'workflows' }`              |
| `workflows:list`    | `{ kind: 'workflows' }`              |
| `workflows:read`    | `{ kind: 'workflow', workflowId }`   |
| `workflows:update`  | `{ kind: 'workflow', workflowId }`   |
| `workflows:publish` | `{ kind: 'workflow', workflowId }`   |
| `workflows:execute` | `{ kind: 'workflow', workflowId }`   |
| `executions:read`   | `{ kind: 'execution', executionId }` |
| `executions:stream` | `{ kind: 'execution', executionId }` |
| `executions:cancel` | `{ kind: 'execution', executionId }` |

## Alternative Options Considered

- **Skip the port; require consumers to fork the routes.** Rejected. Forces every consumer to maintain a divergent copy of `apps/backend/src/routes/`, which is the surface most likely to evolve. The seam is small (one interface + one middleware) and isolates the consumer's auth code from upstream changes.
- **Throw on deny instead of returning a `Response`.** Considered. Cleaner failure surface (a missed `return` cannot silently authorize a request), but requires a Hono `onError` handler that knows about an `AuthDeniedError` type and re-encodes 401/403 from it. Tracked as a follow-up; current `return denied` idiom is documented and tested.
- **Pass the port through Hono `c.var`.** Rejected. The port is a boot-time singleton, not per-request state. Currying `makeAuthorize(port)` once at boot and handing each route factory the bound `authorize` removes the temptation to swap the port mid-request.

## Consequences

- **Pros**
  - **Adapter authoring is a one-file change.** Implementing `AuthPort` and swapping the constructor in `server.ts` is all a consumer needs to wire up SSO/JWT/OAuth.
  - **Anonymous semantics are explicit.** `identify` returning `null` signals "unauthenticated" with no ambiguity. Operators replacing `AllowAllAuthPort` with a JWT port will see the 401 branch fire for anonymous requests immediately.
  - **Secure-by-default boot.** Production startup with the permissive default requires an explicit opt-in env var, so accidental deploys cannot silently expose the API.

- **Cons**
  - **`return denied` footgun.** Handlers must remember the early-return idiom; forgetting it silently lets the request through. Mitigated by JSDoc on `makeAuthorize` and tested in `middleware.test.ts`, but a throw-based variant remains a follow-up.
  - **No data-plane scoping yet.** The port answers "is this caller allowed to do X to resource Y" but does not yet filter list/read by ownership. See the follow-ups below.

## Default: AllowAllAuthPort

```
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
!! AuthPort: AllowAllAuthPort (permissive default) is active.
!! Every request — read, write, publish, execute, cancel — is allowed.
!! Replace with a real AuthPort before exposing this backend to anyone.
!! See: apps/backend/auth-port.decision-log.md
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
```

Production boot with this port is blocked unless `WB_ALLOW_INSECURE=1` is set explicitly.

## Wiring a real provider

Swap the default in `apps/backend/src/server.ts`:

```ts
import { JwtAuthPort } from './auth/jwt-auth-port';

const authPort: AuthPort = new JwtAuthPort({
  issuer: process.env.AUTH_ISSUER!,
  audience: process.env.AUTH_AUDIENCE!,
  jwksUri: process.env.AUTH_JWKS_URI!,
});
```

The `instanceof AllowAllAuthPort` guards around the startup warning and the production-refusal check disappear automatically once a real port is in place.

## Example: simple JWT verification

Sketch that validates a bearer token against a JWKS endpoint and authorizes by role, using [`jose`](https://github.com/panva/jose) (`pnpm add jose`). The interesting bit is the failure handling in `identify` — see the note below the code.

```ts
// apps/backend/src/auth/jwt-auth-port.ts
import { type JWTPayload, createRemoteJWKSet, errors as joseErrors, jwtVerify } from 'jose';

import type { AuthAction, AuthPort, AuthResource, CallerIdentity } from './auth-port';

type Options = {
  issuer: string;
  audience: string;
  jwksUri: string;
};

export class JwtAuthPort implements AuthPort {
  private readonly jwks: ReturnType<typeof createRemoteJWKSet>;

  constructor(private readonly options: Options) {
    this.jwks = createRemoteJWKSet(new URL(options.jwksUri));
  }

  async identify(request: Request): Promise<CallerIdentity | null> {
    const header = request.headers.get('authorization');
    if (!header?.startsWith('Bearer ')) return null;
    const token = header.slice('Bearer '.length);

    try {
      const { payload } = await jwtVerify(token, this.jwks, {
        issuer: this.options.issuer,
        audience: this.options.audience,
      });
      return toIdentity(payload);
    } catch (error) {
      // Token-shaped failures (invalid signature, expired, wrong audience) are
      // anonymous requests — the caller may retry with a fresh token.
      if (error instanceof joseErrors.JOSEError) return null;
      // Anything else (network blip fetching JWKS, JSON parse, programmer bug)
      // is operational — let it surface as a 500 so monitoring catches it.
      // Swallowing it here would mask outages as "stream of anonymous users".
      throw error;
    }
  }

  async authorize(caller: CallerIdentity | null, action: AuthAction, _resource: AuthResource): Promise<boolean> {
    if (!caller) return false;

    const roles = (caller.attributes?.roles as string[] | undefined) ?? [];

    // Reads are open to any authenticated user.
    if (action.endsWith(':read') || action === 'workflows:list' || action === 'executions:stream') {
      return true;
    }

    // Writes require the `editor` role.
    if (action.startsWith('workflows:')) {
      return roles.includes('editor');
    }

    // Execution control requires the `operator` role.
    if (action === 'executions:cancel') {
      return roles.includes('operator');
    }

    return false;
  }
}

function toIdentity(payload: JWTPayload): CallerIdentity | null {
  if (!payload.sub) return null;
  return {
    subject: payload.sub,
    attributes: {
      roles: payload.roles,
      email: payload.email,
    },
  };
}
```

## Design notes

- **The port does not throw for denied access.** Returning `false` keeps the response shape consistent (401 vs 403 picked by the middleware) and lets adapters defer the decision without inventing exception types.
- **`identify` runs once per request**, in middleware. `authorize` runs at each sensitive operation. This lets you key on the request itself (headers, cookies, mTLS peer) once, then make per-resource decisions cheaply.
- **`identify` failure handling distinguishes shape vs operational errors.** Invalid tokens → `null` (anonymous). Infrastructure failures → throw, so monitoring sees them. Catching everything as `null` would mask an IdP outage as a flood of anonymous requests.
- **Resources are structured, not strings.** A `{ kind: 'workflow', workflowId }` tuple is easier to grow than a `'workflow:<id>'` string convention.

## Follow-ups

WB-184 delivers the port + middleware halves of scope L from [`local-dev-binding.decision-log.md`](./local-dev-binding.decision-log.md). The remaining pieces are tracked separately:

- **Schema migration** adding `users`, `tenants`, `ownerId` columns to `workflows` and `executions`.
- **Route-level data scoping** (filter `workflows:list` by ownership, restrict `workflows:read`/`execute` to owned rows or shared via ACL).
- **Throw-based authorize variant** to eliminate the `return denied` footgun (Hono `onError` handler converts `AuthDeniedError` to 401/403).

## Status

Accepted
