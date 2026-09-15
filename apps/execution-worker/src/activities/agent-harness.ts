/**
 * Temporal activity adaptation for the `ai-studio/agent-harness` node type.
 *
 * Ported from Archon's `packages/workflows/src/dag-executor.ts` per
 * PORTING-MAP.md §5 — the file is 12,098 LOC and is NOT ported wholesale;
 * only the slices listed there are extracted and reshaped into a single
 * activity-shaped function. See that table for exact line ranges and
 * fidelity (verbatim / trimmed / adapted / skipped) per slice.
 *
 * Adaptations (A2/A3, per the implementation plan §6 M5):
 *  - Archon's DB-poll cancel check + activity heartbeat DB write are dropped
 *    entirely in favor of Temporal's own cancellation + heartbeat machinery
 *    (`Context.current().cancellationSignal` / `.heartbeat()`), which this
 *    activity already runs inside of (the plugin's `executeNode` activity —
 *    see `packages/temporal/src/activities.ts` — calls this executor).
 *  - Process-group kill (A3): the Copilot SDK owns its own subprocess and
 *    does not expose its pid (verified in M4 against `@github/copilot-sdk`'s
 *    type definitions), so `spawn(..., { detached: true })` +
 *    `process.kill(-pid, 'SIGTERM')` has no attachment point. Cancellation
 *    instead goes through the SDK's own `session.abort()` (already wired end
 *    to end: `provider.sendQuery`'s `abortSignal` option → `bridgeSession` →
 *    `session.abort()` → `client.stop()`). Verified empirically in this
 *    milestone's manual E2E — see the M5 handoff for the measured result.
 *  - Retry loop (Archon L1054-1205) is skipped: v1 runs a node with a single
 *    attempt (`maximumAttempts: 1`, set in M6's activity profile).
 *  - Structured-output reask loop (Archon L2968-3085) is skipped — out of
 *    scope per the porting plan §2.
 *  - UI streaming fan-out (Archon's `safeSendMessage`/`sendStructuredEvent`
 *    calls throughout the L2353-2700 switch) is dropped — out of scope for
 *    this activity; only text/token/warning accumulation is kept.
 */
import { Context } from '@temporalio/activity';
import { execFile } from 'node:child_process';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';

import {
  type ExecutionContext,
  type LoggerPort,
  NodeExecutionError,
  resolveTemplate,
} from '@workflow-builder/execution-core';

import type { ResolvedCredential } from '../agent-harness/credentials/delivery';
import { deliverCredential } from '../agent-harness/credentials/delivery';
import { getAgentProvider } from '../agent-harness/registry';
import { classifyError, toHostNodeExecutionError } from '../agent-harness/shared/error-classification';
import { STEP_IDLE_TIMEOUT_MS, withIdleTimeout } from '../agent-harness/shared/idle-timeout';
import type { IAgentProvider, MessageChunk, TokenUsage } from '../agent-harness/types';
import { mergeTokenUsage } from '../agent-harness/types';
import type { AgentHarnessNode } from '../domain/ai-studio-nodes';

const execFileAsync = promisify(execFile);

export type { AgentHarnessNode } from '../domain/ai-studio-nodes';

export interface AgentHarnessResult {
  output: {
    response: string;
    tokens?: TokenUsage;
    warnings?: string[];
  };
}

export interface AgentHarnessDeps {
  logger?: LoggerPort;
  /**
   * Already-resolved credential for `node.config.credentialVendor`, or
   * `undefined` to rely on ambient/env auth. Credential storage/retrieval
   * (looking a vendor id up in a vault) is not yet wired end-to-end — that
   * is a separate concern from M3's `deliverCredential` (env/file shaping),
   * which this activity does call. Callers (M6+) inject the resolved
   * credential here once that lookup exists.
   */
  credential?: ResolvedCredential;
  /** Provider factory override, defaults to the M4 registry's `getAgentProvider`. */
  getProvider?: (providerId: string) => IAgentProvider;
  /**
   * Override for the Temporal activity context (heartbeat/cancellation).
   * Tests and the manual-invocation smoke test (see the M5 handoff) supply
   * this directly since `Context.current()` throws outside a real activity.
   * Production callers should omit it — `Context.current()` is used.
   */
  activityContext?: { heartbeat: () => void; cancellationSignal: AbortSignal };
}

// ─── Checkout snapshot (Archon dag-executor.ts L1234-1331 — verbatim) ──────

function checkoutSnapshotExcludes(...directories: readonly string[]): readonly string[] {
  return directories.map((d) => path.resolve(d));
}

function isInsideAny(absPath: string, directories: readonly string[]): boolean {
  return directories.some((d) => absPath === d || absPath.startsWith(d + path.sep));
}

/** Path operands of one `git status --porcelain` line (`XY path` or `XY old -> new`). */
function unquotePathSegment(value: string): string {
  return value.startsWith('"') && value.endsWith('"') ? value.slice(1, -1) : value;
}

function porcelainPaths(line: string): string[] {
  const body = line.slice(3);
  return (body.includes(' -> ') ? body.split(' -> ') : [body]).map(unquotePathSegment);
}

/**
 * Snapshot the working tree's dirty state (`git status --porcelain`) for a
 * node's `mutatesCheckout: false` assertion, dropping entries under
 * `excludeDirs`. Returns `undefined` when the check cannot run — cwd outside
 * a repo, or git failing — so a broken assertion degrades to no check rather
 * than breaking unrelated runs.
 */
export async function snapshotCheckout(
  cwd: string,
  excludeDirectories: readonly string[],
): Promise<string | undefined> {
  try {
    const { stdout } = await execFileAsync(
      'git',
      ['-c', 'core.quotePath=false', 'status', '--porcelain', '--untracked-files=normal'],
      { cwd, timeout: 10_000 },
    );
    const relevant = stdout
      .split('\n')
      .filter((line) => line.length > 3)
      .filter((line) => !porcelainPaths(line).some((p) => isInsideAny(path.resolve(cwd, p), excludeDirectories)));
    return relevant.join('\n');
  } catch {
    return undefined;
  }
}

/**
 * Enforce a node's `mutatesCheckout: false` declaration: when the node ran
 * successfully but the pre-run snapshot changed, throw a non-retryable
 * (permanent) error naming the node and listing what moved. Called OUTSIDE
 * any retry path (there is none in v1 — this is naturally satisfied — but
 * kept as an explicit invariant for when retry lands: retrying a node that
 * provably mutates the checkout would only multiply the damage).
 */
export async function assertCheckoutUntouched(
  nodeId: string,
  cwd: string,
  excludeDirectories: readonly string[],
  before: string | undefined,
): Promise<void> {
  if (before === undefined) return;
  const after = await snapshotCheckout(cwd, excludeDirectories);
  if (after === undefined || after === before) return;
  const changedPaths = after.split('\n').filter(Boolean).flatMap(porcelainPaths).slice(0, 10).join(', ');
  throw toHostNodeExecutionError(
    'FATAL',
    'agent_harness.mutates_checkout_violation',
    `Node '${nodeId}' declared 'mutatesCheckout: false' but modified the working tree: ${changedPaths}`,
  );
}

// ─── Background-task drain tracker (Archon L1019-1047 — verbatim) ─────────

/**
 * Tracks the provider's live background-Agent-task set (Archon #2083). A
 * `result` chunk arriving while the set is non-empty must NOT tear down the
 * stream — the provider holds its subprocess open to let the tasks finish
 * and runs a follow-up turn to integrate their output.
 */
function createBackgroundTaskTracker(): {
  update(tasks: { taskId: string }[]): void;
  shouldBreakOnResult(): boolean;
  ids(): string[];
} {
  const live = new Set<string>();
  return {
    update(tasks): void {
      live.clear();
      for (const t of tasks) live.add(t.taskId);
    },
    shouldBreakOnResult(): boolean {
      return live.size === 0;
    },
    ids(): string[] {
      return [...live];
    },
  };
}

// ─── Workdir resolution (A6) ────────────────────────────────────────────────

/**
 * A6: prefer a workdir the caller's workflow context already resolved (no
 * existing `ExecutionContext` field carries one today — `ai-agent`, the only
 * other AI Studio executor, never touches the filesystem — so this checks an
 * optional `variables.workdir` convention M6 may adopt), else fall back to a
 * fresh scratch directory. The caller owns cleanup of an externally-supplied
 * workdir; a scratch dir created here is removed in this activity's own
 * `finally`.
 */
async function resolveWorkdir(context: ExecutionContext): Promise<{ cwd: string; isScratch: boolean }> {
  const fromContext = context.variables?.['workdir'];
  if (typeof fromContext === 'string' && fromContext.length > 0) {
    return { cwd: fromContext, isScratch: false };
  }
  const cwd = await mkdtemp(path.join(tmpdir(), 'agent-harness-'));
  return { cwd, isScratch: true };
}

// ─── Activity context resolution ───────────────────────────────────────────

function resolveActivityContext(override: AgentHarnessDeps['activityContext']): {
  heartbeat: () => void;
  cancellationSignal: AbortSignal;
} {
  if (override) return override;
  try {
    const context = Context.current();
    return { heartbeat: () => context.heartbeat(), cancellationSignal: context.cancellationSignal };
  } catch {
    // No real Temporal activity context (unit test / manual smoke-test
    // invocation) — heartbeat is a no-op and cancellation never fires unless
    // the caller wires its own AbortController via `activityContext`.
    return { heartbeat: () => {}, cancellationSignal: new AbortController().signal };
  }
}

// ─── Main activity ──────────────────────────────────────────────────────────

const HEARTBEAT_INTERVAL_MS = 1000;

export async function executeAgentHarness(
  node: AgentHarnessNode,
  context: ExecutionContext,
  deps: AgentHarnessDeps = {},
): Promise<AgentHarnessResult> {
  const log = deps.logger;
  const activityContext = resolveActivityContext(deps.activityContext);

  const { cwd, isScratch } = await resolveWorkdir(context);
  const artifactsDirectory = path.join(cwd, '.agent-harness-artifacts');

  const abortController = new AbortController();
  const onCancelled = (): void => abortController.abort();
  activityContext.cancellationSignal.addEventListener('abort', onCancelled, { once: true });
  if (activityContext.cancellationSignal.aborted) abortController.abort();

  const heartbeatTimer = setInterval(() => {
    try {
      activityContext.heartbeat();
    } catch {
      // Best-effort; a throwing heartbeat must never crash the node run.
    }
  }, HEARTBEAT_INTERVAL_MS);

  let idleTimedOut = false;
  let cancelled = false;

  try {
    // Credential delivery (M3) — env vars merged into the provider request;
    // any files land under the scratch/workdir's artifacts directory.
    let credentialEnv: Record<string, string> = {};
    if (node.config.credentialVendor && deps.credential) {
      await mkdir(artifactsDirectory, { recursive: true });
      const delivery = deliverCredential(node.config.credentialVendor, deps.credential, {
        artifactsDir: artifactsDirectory,
      });
      credentialEnv = delivery.env;
      for (const file of delivery.files ?? []) {
        await mkdir(path.dirname(file.path), { recursive: true });
        await writeFile(file.path, file.contents);
      }
    }

    // Parity with `ai-agent.ts`: resolve `{{namespace.path}}` references, then
    // prepend upstream node outputs so a prompt with no explicit reference
    // still receives trigger/upstream content (mirrors ai-agent's fallback
    // `userPrompt` — see ai-agent.ts for the twin of this block).
    const resolvedPrompt = resolveTemplate(node.config.prompt, context);
    const previousOutputs = Object.entries(context.nodeOutputs);
    const contextBlock =
      previousOutputs.length > 0
        ? `Context from previous steps:\n\n${previousOutputs
            .map(([nodeId, output]) => {
              const text =
                typeof output === 'string'
                  ? output
                  : typeof output === 'object' &&
                      output !== null &&
                      typeof (output as Record<string, unknown>)['response'] === 'string'
                    ? ((output as Record<string, unknown>)['response'] as string)
                    : JSON.stringify(output);
              return `[${nodeId}]:\n${text}`;
            })
            .join('\n\n')}\n\n---\n\n`
        : '';
    const finalPrompt = `${contextBlock}${resolvedPrompt}`;

    // Fail fast rather than relying on the idle timeout (default 30 min) to
    // eventually notice nothing was ever sent to the provider.
    if (finalPrompt.trim() === '') {
      throw toHostNodeExecutionError('FATAL', 'agent_harness.empty_prompt', `Node '${node.id}' has an empty prompt.`);
    }

    const provider = (deps.getProvider ?? getAgentProvider)(node.config.provider);

    const excludeDirectories = checkoutSnapshotExcludes(artifactsDirectory);
    const mutatesCheckout = node.config.mutatesCheckout;
    const checkoutSnapshotBefore =
      mutatesCheckout === false ? await snapshotCheckout(cwd, excludeDirectories) : undefined;

    const idleTimeoutMs = node.config.idle_timeout ?? STEP_IDLE_TIMEOUT_MS;

    let responseText = '';
    let tokens: TokenUsage | undefined;
    const warnings: string[] = [];
    let sawError: { message: string } | undefined;

    const backgroundTasks = createBackgroundTaskTracker();

    const stream = provider.sendQuery(finalPrompt, cwd, undefined, {
      abortSignal: abortController.signal,
      nodeConfig: node.config,
      env: credentialEnv,
    });

    for await (const chunk of withIdleTimeout(stream, idleTimeoutMs, () => {
      idleTimedOut = true;
      abortController.abort();
    })) {
      responseText = accumulateChunk(chunk, responseText, warnings, backgroundTasks, (sawError_) => {
        sawError = sawError_;
      });
      if (chunk.type === 'result') {
        tokens = mergeTokenUsage([tokens, chunk.tokens].filter((t): t is TokenUsage => t !== undefined));
        if (backgroundTasks.shouldBreakOnResult()) break;
      }
    }

    cancelled = abortController.signal.aborted && !idleTimedOut;

    // OUTSIDE any retry path (there is none in v1) — a mutation turns a
    // "successful" stream into a non-retryable failure.
    if (mutatesCheckout === false && !cancelled) {
      await assertCheckoutUntouched(node.id, cwd, excludeDirectories, checkoutSnapshotBefore);
    }

    if (cancelled) {
      throw toHostNodeExecutionError('TRANSIENT', 'agent_harness.cancelled', `Node '${node.id}' was cancelled.`);
    }

    if (sawError) {
      const error = new Error(sawError.message);
      const errorType = classifyError(error);
      throw toHostNodeExecutionError(errorType, 'agent_harness.provider_error', sawError.message, {
        cause: error,
      });
    }

    if (responseText.trim() === '') {
      const message = idleTimedOut
        ? `Node '${node.id}' timed out with no output (idle for ${String(idleTimeoutMs / 60_000)} min).`
        : `Node '${node.id}' produced no assistant output.`;
      throw toHostNodeExecutionError('TRANSIENT', 'agent_harness.empty_output', message);
    }

    // Partial-output salvage (Archon L3087-3098): idle timeout with non-empty
    // output completes successfully rather than failing — the agent likely
    // finished but the subprocess didn't exit cleanly — surfaced as a warning
    // instead of the UI fan-out message Archon sends (out of scope here).
    if (idleTimedOut) {
      warnings.push(
        `Node '${node.id}' completed via idle timeout (no output for ${String(idleTimeoutMs / 60_000)} min). The AI likely finished but the subprocess didn't exit cleanly.`,
      );
    }

    return {
      output: {
        response: responseText,
        ...(tokens ? { tokens } : {}),
        ...(warnings.length > 0 ? { warnings } : {}),
      },
    };
  } catch (error) {
    if (error instanceof NodeExecutionError) {
      throw error;
    }
    const error_ = error instanceof Error ? error : new Error(String(error));
    const errorType = classifyError(error_);
    log?.error('agent_harness.run_failed', { nodeId: node.id, error: { message: error_.message } });
    throw toHostNodeExecutionError(errorType, 'agent_harness.failed', error_.message, { cause: error_ });
  } finally {
    clearInterval(heartbeatTimer);
    activityContext.cancellationSignal.removeEventListener('abort', onCancelled);
    if (isScratch) {
      await rm(cwd, { recursive: true, force: true }).catch(() => {
        // Best-effort — a leftover scratch dir under the OS tmpdir is not
        // worth failing an otherwise-completed (or already-failed) run over.
      });
    }
  }
}

/**
 * Accumulate one MessageChunk into the running text/warnings state (Archon
 * dag-executor.ts L2353-2700, trimmed — the UI streaming fan-out calls in
 * that switch are dropped; only accumulation survives).
 */
function accumulateChunk(
  chunk: MessageChunk,
  responseText: string,
  warnings: string[],
  backgroundTasks: ReturnType<typeof createBackgroundTaskTracker>,
  markError: (error: { message: string } | undefined) => void,
): string {
  switch (chunk.type) {
    case 'assistant': {
      return responseText + chunk.content;
    }
    case 'system': {
      warnings.push(chunk.content);
      return responseText;
    }
    case 'background_tasks': {
      backgroundTasks.update(chunk.tasks);
      return responseText;
    }
    case 'result': {
      if (chunk.isError && chunk.errorSubtype !== 'success') {
        const detail = chunk.errors?.length ? ` — ${chunk.errors.join('; ')}` : '';
        markError({ message: `Node failed: SDK returned ${chunk.errorSubtype ?? 'unknown'}${detail}` });
      }
      return responseText;
    }
    default: {
      return responseText;
    }
  }
}
