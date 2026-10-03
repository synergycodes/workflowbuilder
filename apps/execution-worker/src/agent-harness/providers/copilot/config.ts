import type { SessionConfig } from '@github/copilot-sdk';

import { assertKnownRunConfigKeys, invalidRunConfigValue, normalizeRunConfigString } from '../../shared/run-config';
import type { CopilotProviderDefaults, EffortRung } from '../../types';

/**
 * Reasoning-depth rungs, weakest to strongest. Mirrors `types.ts`'s
 * `EffortRung` order, which is load-bearing for clamping below.
 *
 * Local, minimal re-declaration: the source ladder normally lives in a shared
 * "paths" package this port does not carry over (see `types.ts`'s own header
 * note), so the one helper that needs the ordered ladder — clamping — keeps
 * its own copy here rather than depend on it.
 */
export const EFFORT_LADDER: readonly EffortRung[] = [
  'minimal',
  'low',
  'medium',
  'high',
  'xhigh',
  'max',
  'ultra',
  'persistent',
];

function isEffortRung(value: unknown): value is EffortRung {
  return typeof value === 'string' && (EFFORT_LADDER as readonly string[]).includes(value);
}

/**
 * Resolves a declared rung into a provider vocabulary. Unsupported values
 * clamp to a weaker rung first so a mapping never silently buys more
 * reasoning than was declared.
 */
function clampEffort<T extends EffortRung>(value: unknown, supported: readonly T[]): T | undefined {
  if (!isEffortRung(value)) return undefined;

  const index = EFFORT_LADDER.indexOf(value);
  const isSupported = (rung: EffortRung): rung is T => (supported as readonly EffortRung[]).includes(rung);

  if (isSupported(value)) return value;

  for (let index_ = index - 1; index_ >= 0; index_--) {
    const candidate = EFFORT_LADDER[index_];
    if (candidate !== undefined && isSupported(candidate)) return candidate;
  }
  for (let index_ = index + 1; index_ < EFFORT_LADDER.length; index_++) {
    const candidate = EFFORT_LADDER[index_];
    if (candidate !== undefined && isSupported(candidate)) return candidate;
  }
  return undefined;
}

/** Compile-time proof that a provider list covers every value in its SDK union. */
type AssertNever<T extends never> = T;

/**
 * The reasoning-depth rungs Copilot's SDK accepts, weakest → strongest.
 *
 * The SDK does not export `ReasoningEffort` from its barrel, but its public
 * `SessionConfig` retains the union.
 *
 * SDK version drift from the Archon source this ports: @github/copilot-sdk
 * 1.0.13's `ReasoningEffort` is `'low' | 'medium' | 'high' | 'xhigh' | 'max'`
 * — Archon's list (pinned against an older SDK) stopped at `'xhigh'`. Added
 * `'max'` here so `CopilotEffortsAreComplete` keeps proving completeness
 * against the SDK we actually depend on.
 */
type CopilotEffort = NonNullable<SessionConfig['reasoningEffort']>;

export const COPILOT_EFFORTS = ['low', 'medium', 'high', 'xhigh', 'max'] as const satisfies readonly CopilotEffort[];

export type CopilotEffortsAreComplete = AssertNever<Exclude<CopilotEffort, (typeof COPILOT_EFFORTS)[number]>>;

/** Exposed so `provider.ts` shares the exact same clamp implementation. */
export { clampEffort };

/**
 * Parse raw `assistants.copilot` config into a typed `CopilotProviderDefaults`.
 *
 * Fallback behavior: fields with unexpected types (or enum values outside the
 * declared set) are silently omitted rather than throwing. A broken user
 * config must not prevent provider registration or workflow discovery.
 * Callers that want strict validation should validate upstream.
 */
export function parseCopilotConfig(raw: Record<string, unknown>): CopilotProviderDefaults {
  const config: CopilotProviderDefaults = {};

  if (typeof raw.model === 'string') {
    config.model = raw.model;
  }

  // Accept any rung of the shared effort ladder and clamp it to the SDK's
  // enum (which has neither `minimal` nor `max`/`ultra`), so
  // `assistants.copilot.*` takes the same vocabulary a workflow's `effort:`
  // does. Normalizing at parse time keeps
  // `CopilotProviderDefaults.modelReasoningEffort` SDK-shaped.
  const effort = clampEffort(raw.modelReasoningEffort, COPILOT_EFFORTS);
  if (effort !== undefined) {
    config.modelReasoningEffort = effort;
  }

  if (typeof raw.copilotCliPath === 'string') {
    config.copilotCliPath = raw.copilotCliPath;
  }

  if (typeof raw.configDir === 'string') {
    config.configDir = raw.configDir;
  }

  if (typeof raw.enableConfigDiscovery === 'boolean') {
    config.enableConfigDiscovery = raw.enableConfigDiscovery;
  }

  if (typeof raw.useLoggedInUser === 'boolean') {
    config.useLoggedInUser = raw.useLoggedInUser;
  }

  if (
    raw.logLevel === 'none' ||
    raw.logLevel === 'error' ||
    raw.logLevel === 'warning' ||
    raw.logLevel === 'info' ||
    raw.logLevel === 'debug' ||
    raw.logLevel === 'all'
  ) {
    config.logLevel = raw.logLevel;
  }

  return config;
}

/** Strict counterpart used only for an explicitly selected per-run layer. */
export function parseCopilotRunConfig(raw: Record<string, unknown>): CopilotProviderDefaults {
  assertKnownRunConfigKeys(raw, [
    'model',
    'modelReasoningEffort',
    'copilotCliPath',
    'configDir',
    'enableConfigDiscovery',
    'useLoggedInUser',
    'logLevel',
  ]);
  const model = normalizeRunConfigString(raw.model, 'model');
  const copilotCliPath = normalizeRunConfigString(raw.copilotCliPath, 'copilotCliPath');
  const configDirectory = normalizeRunConfigString(raw.configDir, 'configDir');
  if (raw.modelReasoningEffort !== undefined && !isEffortRung(raw.modelReasoningEffort)) {
    invalidRunConfigValue('modelReasoningEffort', 'a valid effort level');
  }
  for (const key of ['enableConfigDiscovery', 'useLoggedInUser'] as const) {
    if (raw[key] !== undefined && typeof raw[key] !== 'boolean') {
      invalidRunConfigValue(key, 'a boolean');
    }
  }
  if (
    raw.logLevel !== undefined &&
    (typeof raw.logLevel !== 'string' || !['none', 'error', 'warning', 'info', 'debug', 'all'].includes(raw.logLevel))
  ) {
    invalidRunConfigValue('logLevel', 'none, error, warning, info, debug, or all');
  }
  const parsed = parseCopilotConfig(raw);
  return {
    ...parsed,
    ...(model === undefined ? {} : { model }),
    ...(copilotCliPath === undefined ? {} : { copilotCliPath }),
    ...(configDirectory === undefined ? {} : { configDir: configDirectory }),
  };
}

export { type CopilotProviderDefaults } from '../../types';
