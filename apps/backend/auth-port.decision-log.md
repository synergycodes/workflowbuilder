### Title: AuthPort seam for backend authn/authz

### Proposed by: Kacper Cierzniewski

### Date: 15.05.2026

## Context

The reference backend (`apps/backend`) ships **without** authentication. CORS is wide open and any caller can create, read, publish, execute, and cancel workflows. This is deliberate: real authn/authz is consumer-specific (SSO, JWT, OAuth, custom) and the OSS package does not pick one.

This decision log records the structural piece (scope L from [`local-dev-binding.decision-log.md`](./local-dev-binding.decision-log.md)) that lets consumers plug in their own provider without forking the HTTP routes: introduce `AuthPort`, a Hono auth middleware, and a permissive default.

## Decision

1. Introduce `AuthPort` in `apps/backend/src/auth/auth-port.ts` with two methods:
   - `identify(request)` resolves an incoming `Request` to a `CallerIdentity` or `null` (anonymous).
   - `authorize(caller, action, resource)` returns `true` if the caller may perform the action on the resource; `false` otherwise. Throwing is reserved for unexpected failures (e.g. the IdP is down).
2. Wire HTTP routes through a Hono middleware (`createAuthMiddleware`) that calls `identify` once per request and stashes the caller on `c.var.caller`. Boot code binds the port to an `AssertAuthorized` function via `makeAssertAuthorized(port)` and passes it to each route factory; handlers `await assertAuthorized(...)` before sensitive operations. The function throws `AuthDeniedError` on deny, and `app.onError` in `server.ts` maps the error to 401 (anonymous) or 403 (authenticated but forbidden).
3. Ship `AllowAllAuthPort` as the permissive default for local development. It returns `null` from `identify` (consistent with the design note "Return null when anonymous") and `true` from `authorize`, together short-circuiting the 401/403 paths so the middleware never denies anything until a real port replaces it.
4. Refuse to construct `AllowAllAuthPort` unless the operator sets `WB_AUTH_PORT=allow-all` explicitly. This is a default-secure posture: a forgotten env var in CI, a deploy template, or a copy-paste fails loudly instead of silently starting wide-open. There is no "wide everywhere except production" heuristic that a misconfigured `NODE_ENV` can quietly break. A loud startup warning fires whenever the port boots.

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

Per-row resource kinds (`workflow`, `execution`) also accept an optional `attributes: Record<string, unknown>`. Routes that already loaded the row can pass it through so ABAC ports do not need to refetch. Pure RBAC ports ignore the field. Routes that load before authorize is wired (see follow-ups on data scoping) will start using it without a breaking change.

## Alternative Options Considered

- **Skip the port; require consumers to fork the routes.** Rejected. Forces every consumer to maintain a divergent copy of `apps/backend/src/routes/`, which is the surface most likely to evolve. The seam is small (one interface + one middleware) and isolates the consumer's auth code from upstream changes.
- **Return-based deny (`Response | null`).** Considered and rejected. A missed `if (denied) return denied` silently lets the request through and TypeScript cannot warn about the missing return. The throw-based shape removes the footgun entirely: calling `await assertAuthorized(...)` either proceeds (caller is authorized) or aborts the handler. Cost is one `app.onError` mapping `AuthDeniedError` to 401/403, which is registered once in `server.ts`.
- **Pass the port through Hono `c.var`.** Rejected. The port is a boot-time singleton, not per-request state. Currying `makeAssertAuthorized(port)` once at boot and handing each route factory the bound `assertAuthorized` removes the temptation to swap the port mid-request.

## Consequences

- **Pros**
  - **Adapter authoring is a one-file change.** Implementing `AuthPort` and swapping the constructor in `server.ts` is all a consumer needs to wire up SSO/JWT/OAuth.
  - **Anonymous semantics are explicit.** `identify` returning `null` signals "unauthenticated" with no ambiguity. Operators replacing `AllowAllAuthPort` with a JWT port will see the 401 branch fire for anonymous requests immediately.
  - **No silent allow.** Handlers cannot accidentally forward a deny `Response` or forget to return early. The throw + `onError` shape removes the entire class of bugs the return-based seam invited.
  - **Default-secure boot.** `AllowAllAuthPort` requires `WB_AUTH_PORT=allow-all`. There is no environment heuristic to misconfigure; the only way to run permissively is to set the variable on purpose.

- **Cons**
  - **No data-plane scoping yet.** The port answers "is this caller allowed to do X to resource Y" but does not yet filter list/read by ownership. The `attributes` slot on per-row resources reserves room for ABAC without forcing a breaking change later; see follow-ups.
  - **Action set is a closed union.** Adding a new route action means editing `AuthAction` in `auth-port.ts`. For a reference implementation with a small surface this is the right trade (every adapter sees every action at compile time); a long-running consumer with many bespoke actions would prefer an open string + runtime guard.

## Default: AllowAllAuthPort

```
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
!! AuthPort: AllowAllAuthPort (permissive default) is active.
!! Every request - read, write, publish, execute, cancel - is allowed.
!! Replace with a real AuthPort before exposing this backend to anyone.
!! See: apps/backend/auth-port.decision-log.md
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
```

The constructor throws unless `WB_AUTH_PORT=allow-all` is set explicitly. `apps/backend/.env.example` ships the variable for local development; production environments must remove it (and swap the port) before the process will start.

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

The startup warning and the opt-in env check are local to `AllowAllAuthPort`, so this swap automatically disables both. Remove `WB_AUTH_PORT=allow-all` from the deploy environment at the same time.

## SSE / EventSource auth caveats

`GET /api/executions/:id/stream` is the long-lived SSE endpoint that drives the live execution view in `apps/ai-studio` and `apps/demo`. Browser `EventSource` cannot attach custom request headers, so a JWT-bearer adapter that reads `Authorization` will not work for this endpoint out of the box. Two supported fallbacks:

1. **Cookie session.** If your IdP issues a session cookie (SameSite=Lax for same-origin, set via the login flow), the cookie rides every browser request including SSE. The port reads from `request.headers.get('cookie')` in `identify`.
2. **Short-lived token in the URL.** Mint a single-use token from your authenticated frontend (e.g. `POST /api/exec-stream-token` returns `{ token, expiresAt }`), then open `new EventSource('/api/executions/' + id + '/stream?access_token=' + token)`. The port parses the token from `new URL(request.url).searchParams.get('access_token')`. Treat the token as bearer-equivalent: short TTL, single resource, log usage. Be aware that URLs end up in access logs, browser history, and Referer headers; the token must be short-lived enough that exposure is acceptable.

Token expiry mid-stream is not handled by the seam. `identify` runs once per request, so a 1-hour SSE connection authorized at minute zero stays open through token expiry. Adapters that care should also wire periodic re-auth on the stream callback (`subscribe` in `events/execution-event-bus.ts`), or accept that long-lived streams outlive their tokens. The reference backend does not implement this today.

## CORS for a real port

`server.ts` mounts `cors()` with its defaults: `origin: '*'`, `credentials: false`, no explicit `allowHeaders`. That works for the permissive default but breaks both common real-port shapes:

- **Bearer JWT adapters.** Browser preflight strips `Authorization` unless the server returns it in `Access-Control-Allow-Headers`. Configure `cors({ allowHeaders: ['Authorization', 'Content-Type'], origin: <your frontend origin> })`.
- **Cookie session adapters.** Cookies require `credentials: true` on the server (`Access-Control-Allow-Credentials: true`) and matching `withCredentials: true` on `fetch` / `EventSource`. The wildcard origin is also illegal once credentials are on; you must list the frontend origin(s) explicitly.

Both are operator-side concerns, but plan the CORS change at the same time you swap the port - shipping a real `AuthPort` without updating CORS produces a baffling "preflight rejected" error.

## Example: simple JWT verification

Sketch that validates a bearer token against a JWKS endpoint and authorizes by role, using [`jose`](https://github.com/panva/jose) (`pnpm add jose`). The interesting bit is the failure handling in `identify`, see the note below the code.

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
      // anonymous requests, the caller may retry with a fresh token.
      if (error instanceof joseErrors.JOSEError) return null;
      // Anything else (network blip fetching JWKS, JSON parse, programmer bug)
      // is operational, let it surface as a 500 so monitoring catches it.
      // Swallowing it here would mask outages as "stream of anonymous users".
      throw error;
    }
  }

  async authorize(caller: CallerIdentity | null, action: AuthAction, _resource: AuthResource): Promise<boolean> {
    if (!caller) return false;

    // `roles` is a provider-specific custom claim, not part of RFC 7519.
    // Auth0 surfaces it via a namespaced claim (e.g.
    // `https://your-app/roles`), Cognito as `cognito:groups`, Keycloak as
    // `realm_access.roles`. Replace `roles` below with whatever shape your
    // IdP issues and adjust `toIdentity` to flatten it onto `attributes`.
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

- **The port does not throw for denied access.** Returning `false` keeps the failure path concentrated in one place (the middleware throws `AuthDeniedError`, `onError` translates) and lets adapters defer the decision without inventing exception types.
- **`identify` runs once per request**, in middleware. `assertAuthorized` runs at each sensitive operation. This lets you key on the request itself (headers, cookies, mTLS peer) once, then make per-resource decisions cheaply.
- **`identify` failure handling distinguishes shape vs operational errors.** Invalid tokens become `null` (anonymous). Infrastructure failures throw, so monitoring sees them. Catching everything as `null` would mask an IdP outage as a flood of anonymous requests.
- **Resources are structured, not strings.** A `{ kind: 'workflow', workflowId, attributes? }` tuple is easier to grow than a `'workflow:<id>'` string convention, and the `attributes` slot reserves space for ABAC without breaking the interface later.
- **`AllowAllAuthPort` requires explicit opt-in.** A misconfigured `NODE_ENV` can no longer accidentally enable the permissive path; only an explicit `WB_AUTH_PORT=allow-all` does.

## Follow-ups

WB-184 delivers the port + middleware halves of scope L from [`local-dev-binding.decision-log.md`](./local-dev-binding.decision-log.md). The remaining pieces are tracked separately:

- **Schema migration** adding `users`, `tenants`, `ownerId` columns to `workflows` and `executions`.
- **Route-level data scoping** (filter `workflows:list` by ownership, restrict `workflows:read` / `execute` to owned rows or shared via ACL). The route order will flip to "load row, then assertAuthorized with row in `attributes`" so ABAC ports do not refetch.
- **SSE token refresh** for long-lived `executions:stream` connections that outlive their auth token. Today the port runs once at connect time; a periodic re-check inside the `subscribe` callback would close the gap.

## Status

Accepted
