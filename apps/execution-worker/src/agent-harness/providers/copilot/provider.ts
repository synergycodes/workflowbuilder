/**
 * GitHub Copilot provider (community tier).
 *
 * Implements `IAgentProvider` on top of @github/copilot-sdk. Resolves auth +
 * binary path + reasoning config, translates workflow node options (tool
 * restrictions, agents, structured output) to the SDK's `SessionConfig`,
 * creates or resumes a session, and hands the streaming bridge off to
 * `bridgeSession` in `event-bridge.ts`.
 *
 * Deviation from the Archon source this ports (see PORTING-MAP.md §4.5 /
 * adaptation A4): value imports of `@github/copilot-sdk` are plain top-level
 * imports, not Archon's `await import(...)` inside `sendQuery()`. Archon's
 * lazy import exists to protect a `bun --compile` binary's filesystem
 * resolution at module-load time; this worker is a normal Node process with
 * no such constraint.
 *
 * Also dropped: OAuth-specific branches (out of scope, see the porting plan
 * §2) and Archon's `resetCopilotSingleton` back-compat no-op (test-only
 * artifact of a singleton this port never had, since each `sendQuery()`
 * already constructs a fresh client here as it does upstream).
 */
import { CopilotClient, approveAll } from '@github/copilot-sdk';
import type {
  CopilotClientOptions,
  CopilotSession,
  CustomAgentConfig,
  SessionConfig,
  SystemMessageConfig,
} from '@github/copilot-sdk';

import { logger } from '../../../logger';
import type { IAgentProvider, MessageChunk, ProviderCapabilities, SendQueryOptions } from '../../types';
import { resolveCopilotBinaryPath } from './binary-resolver';
import { COPILOT_CAPABILITIES } from './capabilities';
import { COPILOT_EFFORTS, type CopilotProviderDefaults, clampEffort, parseCopilotConfig } from './config';
import { bridgeSession } from './event-bridge';

// `ReasoningEffort` is defined in the SDK but not re-exported from its
// barrel, so the vocabulary is mirrored in ./config and pinned there against
// `CopilotProviderDefaults`. Derive the type from that one array rather than
// restating the union here.
type CopilotReasoningEffort = (typeof COPILOT_EFFORTS)[number];

/**
 * Auth env vars, split by intent.
 *
 *   - `COPILOT_GITHUB_TOKEN` — Copilot-specific PAT. Setting it is a strong
 *     signal of intent ("use this for Copilot"), so it always wins.
 *   - `GH_TOKEN` / `GITHUB_TOKEN` — generic GitHub tokens. Most users have
 *     these set for `gh` CLI / clone helpers / webhooks, where classic PATs
 *     are fine. Those PATs typically lack Copilot entitlement, so picking
 *     them up automatically yields a misleading "Session was not created
 *     with authentication info" error from the SDK. We therefore ignore
 *     these unless the user explicitly opts in via `useLoggedInUser: false`.
 */
const COPILOT_TOKEN_ENV_KEY = 'COPILOT_GITHUB_TOKEN';
const GENERIC_GITHUB_TOKEN_ENV_KEYS = ['GH_TOKEN', 'GITHUB_TOKEN'] as const;

const log = logger.child({ component: 'agent-harness.copilot.provider' });

// ─── Warning collection ─────────────────────────────────────────────────────

/** Structured provider warning collected during translation; flushed as a system chunk. */
interface ProviderWarning {
  code: string;
  message: string;
}

// ─── Env + auth ─────────────────────────────────────────────────────────────

/**
 * Merge process.env with per-request env vars from the workflow node's
 * env bag. Request env wins — matches the layering other providers use for
 * their SDK env handoff.
 */
function buildCopilotEnv(requestEnv?: Record<string, string>): Record<string, string> {
  const baseEnv = Object.fromEntries(
    Object.entries(process.env).filter((entry): entry is [string, string] => entry[1] !== undefined),
  );
  return { ...baseEnv, ...requestEnv };
}

function resolveCopilotToken(env: Record<string, string>): string | undefined {
  return env[COPILOT_TOKEN_ENV_KEY] || undefined;
}

function resolveGenericGitHubToken(env: Record<string, string>): string | undefined {
  for (const key of GENERIC_GITHUB_TOKEN_ENV_KEYS) {
    const value = env[key];
    if (value) return value;
  }
  return undefined;
}

// ─── Reasoning ──────────────────────────────────────────────────────────────

function normalizeReasoning(value: unknown): CopilotReasoningEffort | undefined {
  const clamped = clampEffort(value, COPILOT_EFFORTS);
  // Copilot's SDK lacks both ends of the ladder, so it clamps more often than
  // any other provider — the one that most needs the adjustment to be visible.
  // Matches the `<provider>.effort_clamped` debug-log convention.
  if (clamped !== undefined && clamped !== value) {
    log.debug('copilot.effort_clamped', { declared: value, applied: clamped });
  }
  return clamped;
}

/**
 * Resolve Copilot's `reasoningEffort` from the node or assistant default.
 */
function resolveCopilotReasoning(
  nodeConfig: SendQueryOptions['nodeConfig'] | undefined,
  copilotConfig: CopilotProviderDefaults,
): { effort: CopilotReasoningEffort | undefined; warning?: string } {
  const declared = nodeConfig?.effort ?? copilotConfig.modelReasoningEffort;
  const effort = normalizeReasoning(declared);
  if (declared !== undefined && effort === undefined) {
    return {
      effort: undefined,
      warning: `Copilot ignored invalid effort '${declared}'.`,
    };
  }
  return { effort };
}

// ─── System prompt ──────────────────────────────────────────────────────────

function resolveSystemMessage(requestOptions?: SendQueryOptions): SystemMessageConfig | undefined {
  const requestPrompt = requestOptions?.systemPrompt;
  const nodePrompt =
    typeof requestOptions?.nodeConfig?.systemPrompt === 'string' ? requestOptions.nodeConfig.systemPrompt : undefined;
  const content = requestPrompt ?? nodePrompt;
  if (typeof content === 'string' && content.length > 0) {
    return { mode: 'append', content };
  }
  return undefined;
}

// ─── Structured output (best-effort, per capabilities.ts) ──────────────────

/**
 * Append a "respond with JSON matching this schema" instruction to the user
 * prompt. Copilot has no native JSON-mode, so structured output is prompt-
 * augmentation only in v1 — the reask/validate loop Archon layers on top
 * (`shared/structured-output.ts`, ajv + jsonrepair) is out of scope per the
 * porting plan §2 ("Structured-output enforcement"); this keeps the wiring
 * capabilities.ts advertises (`structuredOutput: 'best-effort'`) without
 * pulling in that dependency.
 */
function augmentPromptForJsonSchema(prompt: string, schema: Record<string, unknown>): string {
  return `${prompt}

---

CRITICAL: Respond with ONLY a JSON object matching the schema below. No prose before or after the JSON. No markdown code fences. Just the raw JSON object as your final message.

Schema:
${JSON.stringify(schema, null, 2)}`;
}

// ─── Translations ───────────────────────────────────────────────────────────

/**
 * Translate the node's `allowed_tools` / `denied_tools` to Copilot's
 * `availableTools` / `excludedTools`. Copilot's spec: `availableTools` takes
 * precedence over `excludedTools`; we pass both through when present and let
 * the SDK enforce precedence.
 */
function applyToolRestrictions(sessionConfig: SessionConfig, nodeConfig: SendQueryOptions['nodeConfig']): void {
  if (!nodeConfig) return;
  if (nodeConfig.allowed_tools !== undefined) {
    sessionConfig.availableTools = nodeConfig.allowed_tools;
  }
  if (nodeConfig.denied_tools !== undefined) {
    sessionConfig.excludedTools = nodeConfig.denied_tools;
  }
}

/**
 * MCP config translation is deferred: Archon's `mcp/config.ts` (env-var
 * expansion, missing-var detection) is out of scope for v1 per the porting
 * plan §2 ("Skills / MCP functionality ... backend deferred"). `mcp: true`
 * in capabilities.ts describes what the SDK itself supports, not our wiring
 * — surface that gap here as a warning rather than silently dropping the
 * field or half-implementing config loading.
 */
function applyMcpServers(nodeConfig: SendQueryOptions['nodeConfig'], warnings: ProviderWarning[]): void {
  const mcpPath = nodeConfig?.mcp;
  if (typeof mcpPath !== 'string' || mcpPath.length === 0) return;
  warnings.push({
    code: 'copilot.mcp_not_yet_supported',
    message:
      'Copilot MCP config wiring is not yet implemented in this port (schema field kept for cross-provider parity; backend deferred).',
  });
}

/**
 * Skills directory resolution is deferred for the same reason as MCP above —
 * Archon's `shared/skills.ts` (name → directory resolution) is out of scope.
 */
function applySkills(nodeConfig: SendQueryOptions['nodeConfig'], warnings: ProviderWarning[]): void {
  if (!nodeConfig?.skills || nodeConfig.skills.length === 0) return;
  warnings.push({
    code: 'copilot.skills_not_yet_supported',
    message:
      'Copilot skills wiring is not yet implemented in this port (schema field kept for cross-provider parity; backend deferred).',
  });
}

/**
 * `maxBudgetUsd` has no Copilot SDK equivalent (no per-run cost cap). Kept in
 * the schema for cross-provider parity per the porting plan's v1 scope, but
 * silently dropping it would let a user believe a spend cap is enforced when
 * it is not — surface the gap the same way `mcp`/`skills` do above.
 */
function applyCostControl(nodeConfig: SendQueryOptions['nodeConfig'], warnings: ProviderWarning[]): void {
  if (nodeConfig?.maxBudgetUsd === undefined) return;
  warnings.push({
    code: 'copilot.max_budget_not_supported',
    message: `Copilot has no cost-control API; 'maxBudgetUsd: ${nodeConfig.maxBudgetUsd}' was not enforced.`,
  });
}

/**
 * Translate the node's `agents` (Record<name, AgentDef>) to Copilot's
 * `SessionConfig.customAgents`. Only the fields Copilot's `CustomAgentConfig`
 * supports pass through (description, prompt, tools). Fields Copilot cannot
 * represent (`model`, `disallowedTools`, `skills`, `maxTurns`) surface as one
 * consolidated warning per agent.
 *
 * We do NOT set `SessionConfig.agent` — the workflow model invokes
 * sub-agents via the Task tool, not by switching active agent at session
 * start.
 */
function applyAgents(
  sessionConfig: SessionConfig,
  nodeConfig: SendQueryOptions['nodeConfig'],
  warnings: ProviderWarning[],
): void {
  const agents = nodeConfig?.agents;
  if (!agents) return;
  const entries = Object.entries(agents);
  if (entries.length === 0) return;

  const customAgents: CustomAgentConfig[] = entries.map(([name, definition]) => {
    const ignored: string[] = [];
    if (definition.model !== undefined) ignored.push('model');
    if (definition.disallowedTools !== undefined) ignored.push('disallowedTools');
    if (definition.skills !== undefined) ignored.push('skills');
    if (definition.maxTurns !== undefined) ignored.push('maxTurns');

    if (ignored.length > 0) {
      warnings.push({
        code: 'copilot.agent_fields_ignored',
        message: `Copilot agent '${name}' ignored unsupported fields: ${ignored.join(', ')}. Copilot supports description, prompt, tools (allowlist) only.`,
      });
    }

    return {
      name,
      description: definition.description,
      prompt: definition.prompt,
      ...(definition.tools === undefined ? {} : { tools: definition.tools }),
    };
  });

  sessionConfig.customAgents = customAgents;
  log.info('copilot.agents_registered', {
    count: customAgents.length,
    names: customAgents.map((a) => a.name),
  });
}

// ─── SessionConfig assembly ─────────────────────────────────────────────────

/**
 * Single construction site for the Copilot SessionConfig. Callers add new
 * translations as `applyX(sessionConfig, ..., warnings)` calls below — keep
 * business logic here straight-through.
 */
function buildSessionConfig(
  copilotConfig: CopilotProviderDefaults,
  requestOptions: SendQueryOptions | undefined,
  cwd: string,
  onPermissionRequest: SessionConfig['onPermissionRequest'],
  warnings: ProviderWarning[],
): SessionConfig {
  const reasoning = resolveCopilotReasoning(requestOptions?.nodeConfig, copilotConfig);
  if (reasoning.warning) {
    warnings.push({ code: 'copilot.reasoning_ignored', message: reasoning.warning });
  }

  const requestedModel = requestOptions?.model?.trim() || undefined;
  const defaultModel = copilotConfig.model?.trim() || undefined;
  // Default to 'auto' so Copilot picks a model when neither request nor
  // config names one. Matches the shipping Copilot CLI default.
  const resolvedModel = requestedModel ?? defaultModel ?? 'auto';

  const sessionConfig: SessionConfig = {
    model: resolvedModel,
    reasoningEffort: reasoning.effort,
    workingDirectory: cwd,
    streaming: true,
    systemMessage: resolveSystemMessage(requestOptions),
    enableConfigDiscovery: copilotConfig.enableConfigDiscovery ?? false,
    onPermissionRequest,
  };

  applyToolRestrictions(sessionConfig, requestOptions?.nodeConfig);
  applyMcpServers(requestOptions?.nodeConfig, warnings);
  applySkills(requestOptions?.nodeConfig, warnings);
  applyCostControl(requestOptions?.nodeConfig, warnings);
  applyAgents(sessionConfig, requestOptions?.nodeConfig, warnings);

  return sessionConfig;
}

// ─── Error classification ──────────────────────────────────────────────────

/** Best-effort stringify that never yields '[object Object]'. */
function safeErrorString(value: unknown): string {
  if (value === undefined || value === null) return 'Unknown error';
  if (typeof value === 'string') return value || 'Unknown error';
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  try {
    const json = JSON.stringify(value);
    if (json && json !== '{}') return json;
  } catch {
    /* fall through */
  }
  return 'Unknown error';
}

function isModelAccessError(errorMessage: string): boolean {
  const normalized = errorMessage.toLowerCase();
  const hasModel = normalized.includes('model');
  const hasAvailabilitySignal =
    normalized.includes('not available') || normalized.includes('not found') || normalized.includes('unsupported');
  return hasModel && hasAvailabilitySignal;
}

/**
 * Classify common Copilot failure modes and return a more actionable Error.
 * Combines the thrown message with any `lastSessionError` collected via the
 * SDK's `session.error` event — the latter often carries the specific
 * model-access / auth detail while the thrown error is generic.
 */
function buildFriendlyCopilotError(error: unknown, lastSessionError?: string): Error {
  const thrownMessage = error instanceof Error && error.message ? error.message : safeErrorString(error);
  const parts = [thrownMessage, lastSessionError].filter((m): m is string => typeof m === 'string' && m.length > 0);
  const combined = parts.join('\n');

  if (isModelAccessError(combined)) {
    return new Error(
      `Copilot model access error: ${combined}\n\n` +
        'Try a different model in the workflow node or set assistants.copilot.model in provider config.',
    );
  }

  const normalized = combined.toLowerCase();
  if (
    normalized.includes('auth') ||
    normalized.includes('login') ||
    normalized.includes('unauthorized') ||
    normalized.includes('forbidden')
  ) {
    return new Error(
      `Copilot authentication failed: ${combined}\n\n` +
        'Run `copilot login` (default), set COPILOT_GITHUB_TOKEN, or set ' +
        '`useLoggedInUser: false` in provider config to use GH_TOKEN / GITHUB_TOKEN.',
    );
  }

  return error instanceof Error ? error : new Error(combined);
}

// ─── Provider class ─────────────────────────────────────────────────────────

/**
 * GitHub Copilot community provider. Implements `IAgentProvider` on top of
 * `@github/copilot-sdk`, translating workflow node options (tools, agents,
 * structured output, reasoning) to the SDK's `SessionConfig`, bridging its
 * event stream via `bridgeSession()`, and surfacing provider signals
 * (translation warnings, fork workaround, resume fallback) to the caller.
 * Each `sendQuery()` constructs a fresh `CopilotClient` so per-request env
 * vars are honored.
 */
export class CopilotProvider implements IAgentProvider {
  getType(): string {
    return 'copilot';
  }

  getCapabilities(): ProviderCapabilities {
    return COPILOT_CAPABILITIES;
  }

  async *sendQuery(
    prompt: string,
    cwd: string,
    resumeSessionId?: string,
    requestOptions?: SendQueryOptions,
  ): AsyncGenerator<MessageChunk> {
    // forkSession / persistSession are boolean flags the caller may set in
    // normal operation; log-debug rather than throw — throwing would block
    // ordinary session reuse.
    if (requestOptions?.forkSession !== undefined) {
      log.debug('copilot.option_not_supported', {
        option: 'forkSession',
        value: requestOptions.forkSession,
      });
    }
    if (requestOptions?.persistSession !== undefined) {
      log.debug('copilot.option_not_supported', {
        option: 'persistSession',
        value: requestOptions.persistSession,
      });
    }

    const assistantConfig = requestOptions?.assistantConfig ?? {};
    const copilotConfig = parseCopilotConfig(assistantConfig);

    const mergedEnv = buildCopilotEnv(requestOptions?.env);
    const copilotToken = resolveCopilotToken(mergedEnv);
    const genericGithubToken = resolveGenericGitHubToken(mergedEnv);
    const cliPath = await resolveCopilotBinaryPath(copilotConfig.copilotCliPath);

    const warnings: ProviderWarning[] = [];
    const sessionConfig = buildSessionConfig(copilotConfig, requestOptions, cwd, approveAll, warnings);

    // Flush translation warnings before session creation so the user sees
    // them even if session construction fails.
    for (const w of warnings) {
      yield { type: 'system', content: `⚠️ ${w.message}` };
    }

    // Best-effort structured output: Copilot has no native JSON-mode, so we
    // augment the prompt with the schema.
    const outputFormat = requestOptions?.outputFormat;
    const wantsStructured = outputFormat?.type === 'json_schema';
    const effectivePrompt = wantsStructured ? augmentPromptForJsonSchema(prompt, outputFormat.schema) : prompt;

    const clientOptions: CopilotClientOptions = {
      workingDirectory: cwd,
      env: mergedEnv,
    };
    // A custom CLI binary rides a stdio runtime connection.
    if (cliPath) clientOptions.connection = { kind: 'stdio', path: cliPath };
    // configDir override → baseDirectory (sets COPILOT_HOME on the runtime).
    if (copilotConfig.configDir) clientOptions.baseDirectory = copilotConfig.configDir;
    // Auth precedence: see COPILOT_TOKEN_ENV_KEY / GENERIC_GITHUB_TOKEN_ENV_KEYS docs.
    let tokenSource: 'copilot-token' | 'generic-token' | 'logged-in-user';
    if (copilotToken) {
      clientOptions.gitHubToken = copilotToken;
      clientOptions.useLoggedInUser = false;
      tokenSource = 'copilot-token';
    } else if (copilotConfig.useLoggedInUser === false) {
      if (genericGithubToken) {
        clientOptions.gitHubToken = genericGithubToken;
        tokenSource = 'generic-token';
      } else {
        tokenSource = 'logged-in-user';
      }
      clientOptions.useLoggedInUser = false;
    } else {
      clientOptions.useLoggedInUser = true;
      tokenSource = 'logged-in-user';
    }
    if (copilotConfig.logLevel) clientOptions.logLevel = copilotConfig.logLevel;
    const client = new CopilotClient(clientOptions);

    let session: CopilotSession;
    let resumeFailed = false;
    let forkedToFresh = false;
    // Some callers set `forkSession: true` on every reuse so retries start
    // from the pre-node conversation state. The Copilot SDK has no fork API
    // — resumeSession mutates the source session in place. When fork is
    // requested we therefore create a fresh session rather than pollute the
    // source with retry attempts. That loses the prior conversation context,
    // but preserves retry correctness (which is what matters here).
    const wantsFork = requestOptions?.forkSession === true;
    try {
      if (resumeSessionId && !wantsFork) {
        log.debug('copilot.resume_attempt', { sessionId: resumeSessionId, cwd });
        try {
          session = await client.resumeSession(resumeSessionId, sessionConfig);
        } catch (error) {
          log.debug('copilot.resume_failed_falling_back_to_create', {
            err: error,
            sessionId: resumeSessionId,
          });
          resumeFailed = true;
          session = await client.createSession(sessionConfig);
        }
      } else {
        if (resumeSessionId && wantsFork) {
          log.warn('copilot.fork_unsupported_creating_fresh_session', {
            requestedResumeSessionId: resumeSessionId,
          });
          forkedToFresh = true;
        } else {
          log.debug('copilot.create_session', { cwd });
        }
        session = await client.createSession(sessionConfig);
      }
    } catch (error) {
      // Can't connect / create — surface a friendly error and stop the client.
      try {
        await client.stop();
      } catch (error_) {
        log.debug('copilot.client_stop_failed_after_session_error', { err: error_ });
      }
      throw buildFriendlyCopilotError(error);
    }

    if (resumeFailed) {
      yield {
        type: 'system',
        content: '⚠️ Could not resume Copilot session — starting a fresh conversation.',
      };
    } else if (forkedToFresh) {
      yield {
        type: 'system',
        content: '⚠️ Copilot SDK does not support session forking; starting a fresh conversation to keep retries safe.',
      };
    }

    log.info('copilot.session_started', {
      sessionId: session.sessionId,
      model: sessionConfig.model,
      cwd,
      reasoningEffort: sessionConfig.reasoningEffort,
      hasSystemMessage: sessionConfig.systemMessage !== undefined,
      agents: sessionConfig.customAgents?.length ?? 0,
      tokenSource,
      resumed: resumeSessionId !== undefined && !resumeFailed,
    });

    try {
      yield* bridgeSession(session, effectivePrompt, requestOptions?.abortSignal);
      log.info('copilot.prompt_completed', { sessionId: session.sessionId });
    } catch (error) {
      log.error('copilot.prompt_failed', { err: error, sessionId: session.sessionId });
      throw buildFriendlyCopilotError(error);
    } finally {
      // Stop the client so its CLI subprocess shuts down; bridgeSession
      // already handled session.abort() + session.disconnect() in its own
      // finally.
      try {
        const stopErrors = await client.stop();
        if (stopErrors.length > 0) {
          log.warn('copilot.client_stop_errors', { errors: stopErrors.map((error) => error.message) });
        }
      } catch (error) {
        log.debug('copilot.client_stop_threw', { err: error });
      }
    }
  }
}
