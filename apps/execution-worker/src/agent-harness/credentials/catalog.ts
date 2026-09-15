/**
 * Vendor catalog, trimmed to the v1 connectable surface (GitHub Copilot only).
 *
 * The upstream design derives this catalog from every registered provider's
 * `credentials` declaration. v1 has exactly one registered provider, so this
 * is a static single-entry catalog rather than a registry walk; growing it
 * back into a registry-derived catalog is additive once a second provider
 * lands.
 */
import { KNOWN_VENDORS, normalizeCredentialVendor } from './delivery';

export type CredentialKind = 'api_key' | 'oauth';

export interface VendorCatalogEntry {
  vendor: string;
  displayName: string;
  /** Union of kinds this vendor accepts. */
  kinds: CredentialKind[];
  /** Agent provider ids that consume this vendor. */
  agents: string[];
}

const CATALOG: ReadonlyMap<string, VendorCatalogEntry> = new Map([
  [
    'github-copilot',
    {
      vendor: 'github-copilot',
      displayName: 'GitHub Copilot',
      kinds: ['api_key', 'oauth'],
      agents: ['github-copilot'],
    },
  ],
]);

/** Build the vendor catalog (v1: the static Copilot-only entry). */
export function getVendorCatalog(): Map<string, VendorCatalogEntry> {
  return new Map(CATALOG);
}

/** Sorted vendor ids a user can connect an API key for. */
export function listConnectableVendors(): string[] {
  return [...getVendorCatalog().values()]
    .filter((entry) => entry.kinds.includes('api_key'))
    .map((entry) => entry.vendor)
    .sort();
}

/** Whether `id` (vendor-canonical or legacy) is API-key connectable. */
export function isConnectableVendor(id: string): boolean {
  const entry = getVendorCatalog().get(normalizeCredentialVendor(id));
  return !!entry && entry.kinds.includes('api_key');
}

// Sanity guard mirroring the upstream registration-time check: every api_key
// vendor here must have a delivery rule, or a connected credential could
// never be delivered.
for (const entry of CATALOG.values()) {
  if (entry.kinds.includes('api_key') && !KNOWN_VENDORS.has(entry.vendor)) {
    throw new Error(
      `Provider(s) ${entry.agents.join(', ')} declare credential vendor '${entry.vendor}' ` +
        '(api_key) but the delivery map has no rule for it.',
    );
  }
}
