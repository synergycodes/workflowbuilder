/**
 * Per-run AI-provider credential delivery map.
 *
 * Pure-function "how to hand a credential to vendor X" table. Given a
 * vendor-canonical credential id and a decrypted credential (`api_key` or
 * `oauth`), returns the env vars to merge into the run env and, optionally,
 * files to write under `artifactsDir` (e.g. an `auth.json`-shaped file for
 * providers that expect a credential file rather than an env var).
 *
 * Credential ids are upstream-vendor keyed (`github-copilot`, and — in the
 * commented reference cases below — `anthropic`/`openai`) — NOT agent ids.
 * Legacy/alternate id spellings are normalized via
 * {@link normalizeCredentialVendor} before dispatch.
 *
 * v1 wires exactly one live case (`github-copilot`); `anthropic` and `openai`
 * are kept as commented reference cases only, to demonstrate the shape
 * genuinely accommodates a second provider without a redesign (see
 * `../README.md` and the porting plan).
 */

/**
 * Legacy/alternate credential ids → vendor-canonical ids. Accepted at every
 * entry point so callers using an older or agent-keyed spelling keep working;
 * storage always uses the vendor-canonical id.
 */
export const LEGACY_VENDOR_ALIASES: Readonly<Record<string, string>> = {
  copilot: 'github-copilot',
};

/** Map a (possibly legacy) credential id to its vendor-canonical id. */
export function normalizeCredentialVendor(id: string): string {
  return LEGACY_VENDOR_ALIASES[id] ?? id;
}

/**
 * Raw OAuth credential blob minted at login. The exact shape varies per
 * vendor but is always a JSON-serializable object; stored opaquely and
 * passed through verbatim.
 */
export type OAuthCredentials = Record<string, unknown>;

/**
 * A decrypted user credential ready to be delivered to a provider. For API
 * keys the secret is a plain bearer string; for OAuth subscriptions the
 * `oauthApiKey` is a usable bearer, with `rawCreds` preserved for callers
 * that need the full blob (e.g. a file-based delivery).
 */
export type ResolvedCredential =
  { kind: 'api_key'; apiKey: string } | { kind: 'oauth'; oauthApiKey: string; rawCreds: OAuthCredentials };

export interface DeliveryResult {
  env: Record<string, string>;
  /** Files to write before the provider is invoked (e.g. a vendor-specific auth.json). */
  files?: { path: string; contents: string }[];
}

export interface DeliveryOptions {
  /**
   * Per-run artifacts directory. File-based deliveries are written under this
   * directory so they're scoped to the run and don't leak across runs/users.
   */
  artifactsDir: string;
}

/**
 * The set of vendor ids the delivery map can turn into env/files — i.e. the
 * connectable catalog. v1 registers `github-copilot` only; growing this set
 * is additive (see the commented `anthropic`/`openai` reference cases).
 */
export const KNOWN_VENDORS: ReadonlySet<string> = new Set<string>(['github-copilot']);

/**
 * Translate `(provider, credential)` → env (and optional files) to be merged
 * into the per-run env bag. Throws on unknown providers so callers fail fast
 * instead of silently swallowing the credential.
 */
export function deliverCredential(
  provider: string,
  cred: ResolvedCredential,
  options: DeliveryOptions,
): DeliveryResult {
  // v1 only wires github-copilot, which delivers via a bare env var and never
  // touches artifactsDir. Referenced here so the parameter shape (needed by
  // the commented file-delivery reference cases below) stays intact.
  void options;
  const vendor = normalizeCredentialVendor(provider);
  switch (vendor) {
    // Reference case, not implemented in v1 — shows the multi-env-var shape
    // and the api_key-vs-oauth divergence a second provider would need.
    //
    // case 'anthropic': {
    //   if (cred.kind === 'api_key') {
    //     return { env: { ANTHROPIC_API_KEY: cred.apiKey, CLAUDE_API_KEY: cred.apiKey } };
    //   }
    //   return {
    //     env: {
    //       CLAUDE_CODE_OAUTH_TOKEN: cred.oauthApiKey,
    //       ANTHROPIC_OAUTH_TOKEN: cred.oauthApiKey,
    //     },
    //   };
    // }

    // Reference case, not implemented in v1 — shows the `{ env, files }`
    // file-delivery shape for providers that expect a credential file
    // (e.g. a subscription-derived auth.json) rather than a bare env var.
    //
    // case 'openai': {
    //   if (cred.kind === 'api_key') {
    //     return { env: { OPENAI_API_KEY: cred.apiKey } };
    //   }
    //   const authPath = join(options.artifactsDir, 'openai-home', 'auth.json');
    //   return {
    //     env: { OPENAI_HOME: dirname(authPath) },
    //     files: [{ path: authPath, contents: buildOpenAiAuthJson(cred.rawCreds) }],
    //   };
    // }

    case 'github-copilot': {
      // Copilot subscription (oauth) or a Copilot PAT (api_key) → the env var
      // the Copilot provider reads.
      return {
        env: {
          COPILOT_GITHUB_TOKEN: cred.kind === 'api_key' ? cred.apiKey : cred.oauthApiKey,
        },
      };
    }

    default: {
      throw new Error(`Unknown credential vendor '${vendor}'. Known: ${[...KNOWN_VENDORS].sort().join(', ')}.`);
    }
  }
}
