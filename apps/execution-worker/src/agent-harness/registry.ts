/**
 * Provider Registry
 *
 * Typed registry where each entry is a ProviderRegistration record (factory +
 * metadata). Adapted from Archon's `packages/providers/src/registry.ts` per
 * PORTING-MAP.md §4.6: Archon lazily `await import()`s each community
 * provider module so a broken one doesn't block server boot; v1 has exactly
 * one registered provider (Copilot), so the lazy dynamic-import machinery is
 * replaced with a static `Map` populated at module load. Growing this back
 * into a lazy-load registry is additive once a second provider lands.
 */
import { InvalidProviderRunConfigError, UnknownProviderError } from './errors';
import { COPILOT_CAPABILITIES } from './providers/copilot/capabilities';
import { EFFORT_LADDER, parseCopilotRunConfig } from './providers/copilot/config';
import { CopilotProvider } from './providers/copilot/provider';
import type { IAgentProvider, ProviderCapabilities, ProviderInfo, ProviderRegistration } from './types';

function assertValidCapabilities(entry: ProviderRegistration): void {
  if (entry.capabilities.sessionFork === true && !entry.capabilities.sessionResume) {
    throw new Error(`Provider '${entry.id}' cannot advertise sessionFork without sessionResume`);
  }
}

/**
 * Static provider registrations, populated at module load. `Object.hasOwn`
 * (rather than `in` or bracket-access) guards every lookup below so a
 * prototype-chain property (e.g. `toString`) can never be mistaken for a
 * registered provider id.
 */
const REGISTRY: Readonly<Record<string, ProviderRegistration>> = Object.freeze({
  copilot: Object.freeze({
    id: 'copilot',
    displayName: 'Copilot (GitHub)',
    factory: () => new CopilotProvider(),
    capabilities: COPILOT_CAPABILITIES,
    builtIn: false,
    parseRunConfig: parseCopilotRunConfig,
    credentials: {
      kind: 'static',
      specs: [
        {
          vendor: 'github-copilot',
          displayName: 'GitHub Copilot',
          kinds: ['api_key', 'subscription'],
        },
      ],
    },
  } satisfies ProviderRegistration),
});

for (const entry of Object.values(REGISTRY)) {
  assertValidCapabilities(entry);
}

function getEntry(id: string): ProviderRegistration | undefined {
  return Object.hasOwn(REGISTRY, id) ? REGISTRY[id] : undefined;
}

/**
 * Get an instantiated agent provider by ID.
 * @throws UnknownProviderError if not registered
 */
export function getAgentProvider(id: string): IAgentProvider {
  const entry = getEntry(id);
  if (!entry) {
    throw new UnknownProviderError(id, Object.keys(REGISTRY));
  }
  return entry.factory();
}

/**
 * Get the full registration entry for a provider.
 * @throws UnknownProviderError if not registered
 */
export function getRegistration(id: string): ProviderRegistration {
  const entry = getEntry(id);
  if (!entry) {
    throw new UnknownProviderError(id, Object.keys(REGISTRY));
  }
  return entry;
}

/**
 * Get provider capabilities without instantiating a provider.
 * @throws UnknownProviderError if not registered
 */
export function getProviderCapabilities(id: string): ProviderCapabilities {
  return getRegistration(id).capabilities;
}

/** Validate and normalize a run-owned model through the provider's strict parser. */
export function parseProviderRunModel(id: string, model: string): string {
  const parsed = getRegistration(id).parseRunConfig({ model });
  if (typeof parsed.model !== 'string' || parsed.model.trim().length === 0) {
    throw new InvalidProviderRunConfigError('model', 'provider did not accept the model');
  }
  return parsed.model;
}

/** Get all registered providers. */
export function getRegisteredProviders(): ProviderRegistration[] {
  return Object.values(REGISTRY);
}

/** Get API-safe provider info (excludes the factory). */
export function getProviderInfoList(): ProviderInfo[] {
  return getRegisteredProviders().map(({ id, displayName, capabilities, builtIn }) => ({
    id,
    displayName,
    capabilities,
    builtIn,
    ...(capabilities.effortControl ? { effortLevels: EFFORT_LADDER } : {}),
  }));
}

/** Check if a provider is registered. */
export function isRegisteredProvider(id: string): boolean {
  return getEntry(id) !== undefined;
}
