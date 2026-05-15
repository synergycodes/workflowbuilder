/**
 * AuthPort — authentication and authorization seam for the reference backend.
 *
 * The reference backend deliberately ships **without** authentication. Real auth
 * (SSO, JWT, OAuth, custom) is consumer-specific and out of scope for the OSS
 * package. This port lets consumers plug in their own authn/authz without
 * forking the routes.
 *
 * Two responsibilities — kept on separate methods so adapters can mix and match:
 *   1. `identify` — turn an incoming HTTP request into a caller (or null).
 *   2. `authorize` — decide whether that caller may perform an action on a
 *      resource.
 *
 * Implementations must not throw for "not authorized" outcomes — return
 * `false` from `authorize` instead. Throwing is reserved for unexpected
 * failures (e.g. token validation crashed because the upstream IdP is down).
 */

export type CallerIdentity = {
  /** Stable subject identifier (e.g. user id, service principal). */
  subject: string;
  /** Free-form claims for downstream use — roles, tenant, display name, etc. */
  attributes?: Record<string, unknown>;
};

export type AuthAction =
  | 'workflows:create'
  | 'workflows:list'
  | 'workflows:read'
  | 'workflows:update'
  | 'workflows:publish'
  | 'workflows:execute'
  | 'executions:read'
  | 'executions:stream'
  | 'executions:cancel';

export type AuthResource =
  | { kind: 'workflows' }
  | { kind: 'workflow'; workflowId: string }
  | { kind: 'execution'; executionId: string };

export interface AuthPort {
  /**
   * Resolve the caller for an incoming request.
   *
   * - Return a `CallerIdentity` when the request carries valid credentials.
   * - Return `null` when the request is anonymous. Routes will treat this as
   *   unauthenticated when calling `authorize`; the port decides whether
   *   anonymous callers may proceed (see `AllowAllAuthPort`).
   */
  identify(request: Request): Promise<CallerIdentity | null>;

  /**
   * Decide whether `caller` may perform `action` on `resource`.
   * Returning `false` causes the route to respond with 401/403.
   */
  authorize(caller: CallerIdentity | null, action: AuthAction, resource: AuthResource): Promise<boolean>;
}
