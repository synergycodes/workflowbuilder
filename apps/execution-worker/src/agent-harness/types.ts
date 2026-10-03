// CONTRACT LAYER — no SDK imports, no runtime deps beyond SDK-free foundations.
// HARD RULE: This file must never import SDK packages (type-only imports of
// `@github/copilot-sdk` are permitted; nothing else).
//
// See `README.md` for provenance and attribution. Container/overlay write-back
// types and non-Copilot provider-defaults shapes are dropped for v1 (Copilot-only,
// no isolation backend); everything else here is kept structurally verbatim.

/**
 * Reasoning-depth rungs, weakest to strongest. Order is load-bearing for clamping
 * (see the Copilot provider's effort-clamping logic, ported separately).
 *
 * Local, minimal re-declaration: the source ladder normally lives in a shared
 * "paths" package that this port does not carry over, so the contract layer
 * defines its own copy rather than depend on it.
 */
export type EffortRung = 'minimal' | 'low' | 'medium' | 'high' | 'xhigh' | 'max' | 'ultra' | 'persistent';

/**
 * Community provider defaults for GitHub Copilot (@github/copilot-sdk).
 */
export interface CopilotProviderDefaults {
  [key: string]: unknown;
  /** Default model ref, e.g. 'gpt-5', 'gpt-5-mini', 'claude-sonnet-4.5'. */
  model?: string;
  /**
   * Reasoning effort passed to the SDK as `reasoningEffort`. Field name
   * mirrors other providers' reasoning-effort fields so users get one
   * consistent key across cross-provider configs.
   */
  modelReasoningEffort?: EffortRung;
  /**
   * Absolute path to the Copilot CLI binary. Required when the
   * `COPILOT_CLI_PATH` env var is not set and the CLI is not resolvable
   * from `$PATH`.
   */
  copilotCliPath?: string;
  /**
   * Override Copilot's config directory. When unset the SDK uses its own
   * default (typically `~/.copilot`).
   */
  configDir?: string;
  /**
   * Opt in to Copilot's config discovery from the repo (MCP servers, skills,
   * etc. declared in the repo's `.copilot/` directory). Disabled by default
   * so arbitrary repos do not implicitly load MCP servers or skills.
   * @default false
   */
  enableConfigDiscovery?: boolean;
  /**
   * Reuse the CLI's logged-in user credentials (from `copilot login`) when
   * no explicit token is provided via env vars. Defaults to true.
   * @default true
   */
  useLoggedInUser?: boolean;
  /**
   * Copilot CLI log level. When unset the SDK picks its own default.
   */
  logLevel?: 'none' | 'error' | 'warning' | 'info' | 'debug' | 'all';
}

/** Generic per-provider defaults bag used by config surfaces and UI. */
export type ProviderDefaults = Record<string, unknown>;

/** Strict parser for an explicitly selected, run-scoped provider config layer. */
export type ProviderRunConfigParser = (raw: ProviderDefaults) => ProviderDefaults;

/** Provider-keyed defaults map. Built-ins may refine individual entries. */
export type ProviderDefaultsMap = Record<string, ProviderDefaults>;

/**
 * Token usage statistics from AI provider responses.
 */
export interface TokenUsage {
  /** Gross prompt input, including cache reads and writes reported separately. */
  input: number;
  output: number;
  /** Provider-reported cached input. Absent means unsupported or unknown; zero is known. */
  cacheRead?: number;
  /** Provider-reported cache-creation input. Absent means unsupported or unknown; zero is known. */
  cacheWrite?: number;
  /**
   * Set only by aggregation ({@link mergeTokenUsage}), never by a provider. When true the
   * cache axes on this usage are a FLOOR: at least one contributing usage did not report
   * that axis, so true cache use is at least the reported total and
   * `input - cacheRead - cacheWrite` is an UPPER bound on full-price input rather than an
   * exact figure. Absent means the cache totals are complete, or that no axis is present
   * at all.
   */
  cachePartial?: true;
  /** Total of gross input, output, and any provider-reported reasoning tokens. */
  total?: number;
  cost?: number;
}

/**
 * Sum usages into one aggregate, keeping every cache figure that was actually reported.
 *
 * `input` and `output` always sum across every entry. Each cache axis sums over only the
 * entries that define it and is emitted when at least one did, so a silent contributor
 * NARROWS the total instead of erasing it; `cachePartial` then marks the result as a floor.
 * Withholding the axis entirely, as this once did, left gross `input` standing beside no
 * cache context at all and read as "nothing was cached".
 *
 * An axis no entry reports stays absent, which already encodes "unknown" — that case is not
 * flagged. The two axes are decided independently.
 *
 * Pure by design: callers own validation and logging, because their contexts differ (persisted
 * state vs. non-finite guarding at the call site). Entries are expected to have finite
 * `input`/`output` already; `total` and `cost` are not aggregated here.
 */
export function mergeTokenUsage(usages: readonly TokenUsage[]): TokenUsage | undefined {
  if (usages.length === 0) return undefined;
  const merged: TokenUsage = {
    input: usages.reduce((sum, usage) => sum + usage.input, 0),
    output: usages.reduce((sum, usage) => sum + usage.output, 0),
  };
  // A contribution that is itself a floor keeps the whole aggregate a floor.
  let partial = usages.some((usage) => usage.cachePartial === true);
  for (const axis of ['cacheRead', 'cacheWrite'] as const) {
    const reporters = usages.filter((usage) => usage[axis] !== undefined);
    if (reporters.length === 0) continue;
    merged[axis] = reporters.reduce((sum, usage) => sum + (usage[axis] ?? 0), 0);
    if (reporters.length < usages.length) partial = true;
  }
  if (partial && (merged.cacheRead !== undefined || merged.cacheWrite !== undefined)) {
    merged.cachePartial = true;
  }
  return merged;
}

/** Concrete model identifier reported by a provider after a request completes. */
export interface ResolvedModel {
  id: string;
}

/**
 * Message chunk from AI assistant.
 * Discriminated union with per-type required fields for type safety.
 */
export type MessageChunk =
  | {
      type: 'assistant';
      content: string;
      /** When true, batch-mode adapters flush pending content and this chunk
       *  to the platform immediately. Used by providers whose notify() calls
       *  surface content the user must act on before the node blocks for input. */
      flush?: boolean;
    }
  | { type: 'system'; content: string }
  | { type: 'thinking'; content: string }
  /**
   * Marks the start of a new assistant turn (e.g. a planning preamble before
   * a tool call, followed by a separate turn for the final summary). Emitted
   * so consumers can tell "final answer" apart from prior turns' text —
   * without it, a multi-turn agentic session's turns get silently
   * concatenated into one undifferentiated blob. See `agent-harness.ts`'s
   * `accumulateChunk`, which resets the running response text on this chunk.
   */
  | { type: 'assistant_turn_boundary' }
  | {
      type: 'result';
      sessionId?: string;
      tokens?: TokenUsage;
      structuredOutput?: unknown;
      isError?: boolean;
      errorSubtype?: string;
      /** SDK-provided error detail strings. Populated when isError is true. */
      errors?: string[];
      cost?: number;
      stopReason?: string;
      numTurns?: number;
      /** Concrete model reported by the provider; omitted when its SDK does not expose one. */
      resolvedModel?: ResolvedModel;
      /**
       * Outcome of a session-resume attempt, so a failed resume is observable
       * instead of silently continuing with a fresh (cold) session:
       *   - `true`   a resume was requested and the prior session was restored
       *   - `false`  a resume was requested but the provider fell back to fresh
       *   - omitted  no resume was requested
       * Set only when `resumeSessionId` was passed. Consumers (the agent-harness
       * activity) use `false` to surface a warning rather than swallow the loss.
       */
      resumed?: boolean;
    }
  | { type: 'rate_limit'; rateLimitInfo: Record<string, unknown> }
  | {
      type: 'tool';
      toolName: string;
      toolInput?: Record<string, unknown>;
      /** Stable per-call ID from the underlying SDK. When present, the platform
       *  adapter uses it directly instead of generating one — guarantees
       *  `tool_call`/`tool_result` pair correctly even when multiple tools with
       *  the same name run concurrently. */
      toolCallId?: string;
    }
  | {
      type: 'tool_result';
      toolName: string;
      toolOutput: string;
      /** Matching ID for the originating `tool` chunk. See `tool` variant above. */
      toolCallId?: string;
      /**
       * Known statuses are provider-reported. `unknown` covers two distinct
       * cases that share one property — no authoritative status exists:
       *   1. the provider completed the tool but reports no status, and
       *   2. a synthetic closure emitted with no provider result at all.
       * Never inferred from formatted output: a tool whose text merely looks
       * like an error is still `unknown`, because guessing here would put a
       * fabricated status next to reported ones and make neither trustworthy.
       */
      toolOutcome?: 'success' | 'error' | 'interrupted' | 'unknown';
      /** Provider-reported process exit code, when the tool exposes one. */
      exitCode?: number;
    }
  // ─── Subagent Task Lifecycle (provider `system` subtypes) ──────────────
  // Forwarded by providers whose SDKs report subagent task lifecycle events.
  // Downstream (the agent-harness activity) aggregates these into
  // `task_activity`-style signals so callers get subagent visibility per node.
  | {
      type: 'task_started';
      taskId: string;
      description: string;
      taskType?: string;
      prompt?: string;
      toolUseId?: string;
    }
  | {
      type: 'task_progress';
      taskId: string;
      description: string;
      summary?: string;
      usage?: { total_tokens: number; tool_uses: number; duration_ms: number };
      lastToolName?: string;
      toolUseId?: string;
    }
  | {
      type: 'task_notification';
      taskId: string;
      status: 'completed' | 'failed' | 'stopped';
      summary: string;
      outputFile: string;
      usage?: { total_tokens: number; tool_uses: number; duration_ms: number };
      toolUseId?: string;
    }
  // The FULL set of live background tasks, emitted whenever membership changes.
  // Level signal with REPLACE semantics — consumers swap their set for each
  // payload (an empty array means no background work is running). A `result`
  // chunk that arrives while the set is non-empty must not tear down the
  // stream, or the subprocess (and the tasks' pending artifacts) get killed.
  | {
      type: 'background_tasks';
      tasks: { taskId: string; taskType: string; description: string }[];
    }
  // ─── Hook Lifecycle (provider `system` subtypes) ───────────────────────
  // Same aggregation path as task_* above; consumers emit `hook_activity` for
  // inline indicators like `PreToolUse(Bash) → approved` under the parent node.
  | {
      type: 'hook_started';
      hookId: string;
      hookName: string;
      hookEvent: string;
    }
  | {
      type: 'hook_response';
      hookId: string;
      hookName: string;
      hookEvent: string;
      outcome: 'success' | 'error' | 'cancelled';
      exitCode?: number;
    }
  | { type: 'workflow_dispatch'; workerConversationId: string; workflowName: string };

/**
 * System prompt input accepted by all providers. Mirrors the Claude Agent SDK
 * preset-with-append shape so callers can opt into cacheable prefix behavior.
 * Hand-written duplicate of the SDK type — see file-header rule forbidding SDK imports here.
 */
export interface SystemPromptPreset {
  type: 'preset';
  preset: 'claude_code';
  append?: string;
  excludeDynamicSections?: boolean;
}

export type SystemPromptInput = string | string[] | SystemPromptPreset;

/**
 * Universal request options accepted by all providers.
 * Provider-specific fields go through `nodeConfig` in SendQueryOptions.
 */
export interface AgentRequestOptions {
  model?: string;
  abortSignal?: AbortSignal;
  systemPrompt?: SystemPromptInput;
  outputFormat?: { type: 'json_schema'; schema: Record<string, unknown> };
  env?: Record<string, string>;
  /**
   * Names in `env` whose values were injected as credentials rather than
   * loaded from project configuration. Custom provider configuration must
   * not be allowed to select them.
   */
  protectedEnvKeys?: readonly string[];
  maxBudgetUsd?: number;
  fallbackModel?: string;
  /**
   * Request an immutable fork of `resumeSessionId`. Exact-fork callers such as
   * named workflow resume must first verify `sessionFork === true`. Legacy session
   * reuse may still send this flag to resume-only providers, where behavior is
   * provider-specific and immutability is not guaranteed.
   */
  forkSession?: boolean;
  /** When false, skip writing session transcript to disk. */
  persistSession?: boolean;
  /**
   * In-process tools the model may call this turn. Defined once by the caller
   * and adapted per provider. Providers without an in-process tool path ignore
   * them. Gated on the `nativeTools` capability.
   */
  nativeTools?: NativeTool[];
}

/**
 * A provider-neutral in-process tool. The handler runs in the host process and
 * closes over whatever live context it needs, so this contract layer never
 * imports the caller's package — the tool crosses the boundary as data plus a
 * function on the request options.
 *
 * `inputSchema` is canonical JSON Schema (object). Each provider converts it to
 * its SDK's schema form. The handler is expected to return a text result rather
 * than throw — provider adapters add no safety net, so an uncaught throw would
 * surface into the agent loop.
 */
export interface NativeTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  handler: (input: Record<string, unknown>) => Promise<string>;
}

/**
 * Raw node configuration from workflow YAML.
 * Providers translate fields they understand; unknown fields are ignored.
 */
export interface NodeConfig {
  /** Node ID from the workflow graph — used by providers for per-node isolation (e.g., session dirs). */
  nodeId?: string;
  mcp?: string;
  hooks?: unknown;
  skills?: string[];
  /**
   * Inline sub-agent definitions (keyed by kebab-case agent ID).
   *
   * Intentional hand-written duplicate of the node schema's agent-definition
   * shape (authoritative source: the host's node schema layer). Normally the
   * rule is "derive types from the schema, never write parallel interfaces" —
   * broken here on purpose: this contract subpath is consumed by the executor,
   * so importing the node schema would create a circular dependency.
   *
   * Drift risk: when the schema gains a field, this shape must be updated
   * by hand.
   */
  agents?: Record<
    string,
    {
      description: string;
      prompt: string;
      model?: string;
      tools?: string[];
      disallowedTools?: string[];
      skills?: string[];
      maxTurns?: number;
    }
  >;
  allowed_tools?: string[];
  denied_tools?: string[];
  effort?: EffortRung;
  sandbox?: unknown;
  betas?: string[];
  output_format?: Record<string, unknown>;
  maxBudgetUsd?: number;
  systemPrompt?: SystemPromptInput;
  fallbackModel?: string;
  /**
   * Per-node override for Claude Code settingSources — which filesystem
   * setting sources the SDK loads (CLAUDE.md, skills, commands, agents).
   * Falls back to ['project', 'user'] when unset. Claude-only; other
   * providers ignore it (the executor warns via the settingSources
   * capability axis).
   */
  settingSources?: ('project' | 'user')[];
  idle_timeout?: number;
  /**
   * Per-node override for Claude's `agentProgressSummaries` flag. When unset,
   * workflow nodes default to `true` so callers get AI-generated `summary`
   * fields on `task_progress` periodically. Authors can explicitly set
   * `false` to opt out for a specific node.
   */
  agentProgressSummaries?: boolean;
  [key: string]: unknown;
}

/**
 * Extended options for sendQuery, adding workflow-specific context.
 */
export interface SendQueryOptions extends AgentRequestOptions {
  /** Raw YAML node config — provider translates internally to SDK-specific options. */
  nodeConfig?: NodeConfig;
  /** Per-provider defaults from config assistants section. */
  assistantConfig?: Record<string, unknown>;
}

/**
 * Provider capability flags. The executor uses these for capability warnings
 * when a node specifies features the target provider doesn't support.
 */
export interface ProviderCapabilities {
  sessionResume: boolean;
  /**
   * Given a session ID, create a new session containing the source history
   * while leaving the source unchanged. Omission means unsupported.
   */
  sessionFork?: boolean;
  mcp: boolean;
  hooks: boolean;
  skills: boolean;
  /** Whether the provider supports inline sub-agent definitions (Claude SDK's options.agents). */
  agents: boolean;
  toolRestrictions: boolean;
  /**
   * Built-in tool-name vocabulary for advisory validation of
   * `allowed_tools`/`denied_tools` entries. When present, workflow validation
   * warns (never errors) on entries not in this list — after stripping a
   * `Tool(specifier)` suffix and skipping `mcp__*` names, which are dynamic
   * per-install. When absent, the check is skipped entirely: providers without
   * a stable audited vocabulary opt out simply by not declaring one, keeping
   * their tool names out of the shared schema.
   */
  knownToolNames?: readonly string[];
  /**
   * Old tool name → current tool name, for tools the provider's SDK has
   * renamed (e.g. Claude's `Task` → `Agent`). Lets validation give a precise
   * "renamed" hint instead of a generic unknown-name warning, since a stale
   * name is a silent no-op at runtime.
   */
  renamedTools?: Readonly<Record<string, string>>;
  /**
   * Structured-output guarantee tier for `output_format`:
   *  - `'enforced'`    — SDK/backend grammar-constrains decoding. The request
   *    path is native; the executor still validates post-parse as a net for
   *    the refusal / `max_tokens`-truncation edges.
   *  - `'best-effort'` — prompt-augmentation + repair + post-parse validate
   *    (Copilot). No backend grammar; on a validation miss the executor re-asks
   *    up to 3× (prompt + schema errors), then fails the node.
   *  - `false`         — the provider cannot produce structured output at all.
   */
  structuredOutput: 'enforced' | 'best-effort' | false;
  envInjection: boolean;
  costControl: boolean;
  effortControl: boolean;
  fallbackModel: boolean;
  sandbox: boolean;
  /**
   * Whether the provider honors the per-node `settingSources` override (which
   * filesystem setting sources the agent loads: CLAUDE.md, skills, commands,
   * agents). `true` for Claude only; other providers have no equivalent knob.
   */
  settingSources: boolean;
  /** Whether the provider can register in-process `NativeTool`s for a turn. */
  nativeTools: boolean;
  /**
   * Whether the provider can execute inside a container isolation backend
   * (i.e. it knows how to spawn its CLI via `docker exec` rather than a local
   * process). Container isolation is out of scope for v1; every registered
   * provider sets this `false` until an isolation backend exists.
   */
  containerExec: boolean;
}

/**
 * How a credential of a given vendor can be connected / detected.
 *  - `api_key`      — a pasteable bearer string, stored encrypted per user.
 *  - `subscription` — an OAuth login (Claude Pro/Max, GitHub Copilot, ChatGPT).
 *  - `ambient`      — cloud credential chains detected from the environment
 *    (AWS for Bedrock, gcloud ADC for Vertex). Never stored, status-only.
 *
 * Exported as a const tuple so API schemas can derive `z.enum(CREDENTIAL_KINDS)`
 * instead of re-listing the literals.
 */
export const CREDENTIAL_KINDS = ['api_key', 'subscription', 'ambient'] as const;
export type CredentialKind = (typeof CREDENTIAL_KINDS)[number];

/**
 * One upstream-vendor credential an agent provider can consume. `vendor` is the
 * canonical credential id (e.g. 'anthropic', 'openrouter', 'github-copilot') —
 * deliberately NOT the agent provider id: one credential can serve multiple
 * agents (an 'anthropic' key powers Claude Code and other Anthropic-backed
 * providers). Delivery (vendor → env vars / files) is owned by
 * `agent-harness/credentials` — this spec is only the consumption matrix.
 */
export interface CredentialSpec {
  /** Canonical vendor id — used as the storage key for the credential. */
  vendor: string;
  /** Human-readable vendor name for UI display (e.g. 'OpenRouter'). */
  displayName: string;
  /** Which connection kinds this vendor supports for this agent (at least one). */
  kinds: [CredentialKind, ...CredentialKind[]];
}

/**
 * An agent's credential catalog. `static` lists the vendors up front;
 * `dynamic` means the set is only knowable at runtime.
 */
export type ProviderCredentialCatalog = { kind: 'static'; specs: CredentialSpec[] } | { kind: 'dynamic' };

/**
 * Registration entry for a provider in the provider registry.
 * Each entry carries metadata, a factory, and model-compatibility logic.
 * The registry is the source of truth for provider identity, capabilities, and display.
 */
export interface ProviderRegistration {
  /** Unique provider identifier — used in YAML, config, DB */
  id: string;

  /** Human-readable name for UI display */
  displayName: string;

  /** Instantiate a provider */
  factory: () => IAgentProvider;

  /** Static capability declaration — used for executor warnings */
  capabilities: ProviderCapabilities;

  /** Whether this is a built-in (maintained by core team) or community provider */
  builtIn: boolean;

  /**
   * Credentials this agent can consume. Required: registering an agent without
   * declaring its credential surface is a bug, not a default — the
   * connectable-vendor catalog and the agent→credential matrix are derived
   * from these declarations.
   */
  credentials: ProviderCredentialCatalog;

  /**
   * Validate and normalize provider defaults selected for one workflow run.
   * Ordinary config remains defensive and tolerant; explicit run config must
   * reject values the provider would otherwise silently discard.
   */
  parseRunConfig: ProviderRunConfigParser;
}

/**
 * API-safe projection of ProviderRegistration (excludes non-serializable fields).
 * Used by the providers listing API and consumed by the UI.
 */
export interface ProviderInfo {
  id: string;
  displayName: string;
  capabilities: ProviderCapabilities;
  builtIn: boolean;
  /** The shared ladder when this provider accepts `effort:`; absent otherwise. */
  effortLevels?: readonly EffortRung[];
}

/**
 * Generic agent provider interface.
 * Allows supporting multiple agent providers (Copilot today, others later).
 */
export interface IAgentProvider {
  /**
   * Send a message and get streaming response.
   * @param prompt - User message or prompt
   * @param cwd - Working directory for the provider
   * @param resumeSessionId - Optional session ID to resume
   * @param options - Optional request options (universal + nodeConfig + assistantConfig)
   */
  sendQuery(
    prompt: string,
    cwd: string,
    resumeSessionId?: string,
    options?: SendQueryOptions,
  ): AsyncGenerator<MessageChunk>;

  /**
   * Get the provider type identifier (e.g. 'copilot').
   */
  getType(): string;

  /**
   * Get the provider's capability flags.
   * Used by the executor to warn when nodes specify unsupported features.
   */
  getCapabilities(): ProviderCapabilities;
}
