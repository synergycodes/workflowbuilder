import { execFile } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { afterEach, describe, expect, test } from 'vitest';

import type { ExecutionContext } from '@workflow-builder/execution-core';

import type { IAgentProvider, MessageChunk, ProviderCapabilities } from '../agent-harness/types';
import { type AgentHarnessNode, executeAgentHarness } from './agent-harness';

const execFileAsync = promisify(execFile);

const FAKE_CAPABILITIES: ProviderCapabilities = {
  sessionResume: false,
  mcp: false,
  hooks: false,
  skills: false,
  agents: false,
  toolRestrictions: false,
  structuredOutput: false,
  envInjection: false,
  costControl: false,
  effortControl: false,
  fallbackModel: false,
  sandbox: false,
  settingSources: false,
  nativeTools: false,
  containerExec: false,
};

/** Fake IAgentProvider driven by a hand-written async generator — no real CLI/SDK. */
class FakeProvider implements IAgentProvider {
  /** Captures the exact prompt string `executeAgentHarness` sent, for assertion in tests. */
  public receivedPrompt: string | undefined;

  constructor(private readonly chunks: MessageChunk[] | (() => AsyncGenerator<MessageChunk>)) {}

  getType(): string {
    return 'fake';
  }

  getCapabilities(): ProviderCapabilities {
    return FAKE_CAPABILITIES;
  }

  async *sendQuery(prompt: string): AsyncGenerator<MessageChunk> {
    this.receivedPrompt = prompt;
    if (typeof this.chunks === 'function') {
      yield* this.chunks();
      return;
    }
    for (const chunk of this.chunks) {
      yield chunk;
    }
  }
}

class ThrowingProvider implements IAgentProvider {
  constructor(
    private readonly error: Error,
    private readonly beforeThrow?: MessageChunk[],
  ) {}

  getType(): string {
    return 'fake-throwing';
  }

  getCapabilities(): ProviderCapabilities {
    return FAKE_CAPABILITIES;
  }

  async *sendQuery(): AsyncGenerator<MessageChunk> {
    for (const chunk of this.beforeThrow ?? []) {
      yield chunk;
    }
    throw this.error;
  }
}

function makeContext(overrides: Partial<ExecutionContext> = {}): ExecutionContext {
  return {
    workflowId: 'wf-1',
    executionId: 'exec-1',
    triggerPayload: {},
    nodeOutputs: {},
    variables: {},
    global: {},
    ...overrides,
  };
}

function makeNode(overrides: Partial<AgentHarnessNode['config']> = {}): AgentHarnessNode {
  return {
    id: 'agent-harness-1',
    type: 'ai-studio/agent-harness',
    config: {
      prompt: 'hello',
      provider: 'fake',
      ...overrides,
    },
  };
}

const scratchDirectoriesToClean: string[] = [];
afterEach(async () => {
  await Promise.all(
    scratchDirectoriesToClean.splice(0).map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

describe('executeAgentHarness', () => {
  test('accumulates text, tokens, and warnings into the final output shape', async () => {
    const provider = new FakeProvider([
      { type: 'system', content: 'a warning' },
      { type: 'assistant', content: 'Hello ' },
      { type: 'assistant', content: 'world' },
      { type: 'result', sessionId: 's1', tokens: { input: 10, output: 5 } },
    ]);

    const result = await executeAgentHarness(makeNode(), makeContext(), {
      getProvider: () => provider,
    });

    expect(result.output.response).toBe('Hello world');
    expect(result.output.tokens).toEqual({ input: 10, output: 5 });
    expect(result.output.warnings).toEqual(['a warning']);
  });

  test("discards a prior turn's text on assistant_turn_boundary, keeping only the final turn's response", async () => {
    const provider = new FakeProvider([
      { type: 'assistant', content: "I'll inspect the working directory, then create plan.md." },
      { type: 'tool', toolName: 'writeFile' },
      { type: 'assistant_turn_boundary' },
      { type: 'assistant', content: 'Created plan.md with three rate-limiting approaches.' },
      { type: 'result', sessionId: 's1' },
    ]);

    const result = await executeAgentHarness(makeNode(), makeContext(), {
      getProvider: () => provider,
    });

    expect(result.output.response).toBe('Created plan.md with three rate-limiting approaches.');
  });

  test('resolves {{namespace.path}} references in the prompt before sending it to the provider', async () => {
    const provider = new FakeProvider([{ type: 'assistant', content: 'ok' }]);

    await executeAgentHarness(
      makeNode({ prompt: 'Classify: {{trigger.inputPrompt}}' }),
      makeContext({ triggerPayload: { inputPrompt: 'Charged twice, need a refund.' } }),
      { getProvider: () => provider },
    );

    expect(provider.receivedPrompt).toContain('Charged twice, need a refund.');
    expect(provider.receivedPrompt).not.toContain('{{trigger.inputPrompt}}');
  });

  test('prepends upstream node outputs to the prompt, matching ai-agent.ts parity, even without an explicit reference', async () => {
    const provider = new FakeProvider([{ type: 'assistant', content: 'ok' }]);

    await executeAgentHarness(
      makeNode({ prompt: 'Classify the ticket above.' }),
      makeContext({ nodeOutputs: { 'trigger-1': { response: 'Charged twice, need a refund.' } } }),
      { getProvider: () => provider },
    );

    expect(provider.receivedPrompt).toContain('Charged twice, need a refund.');
    expect(provider.receivedPrompt).toContain('Classify the ticket above.');
  });

  test('classifies a FATAL provider error as a permanent (non-retryable) error', async () => {
    const provider = new ThrowingProvider(new Error('401 unauthorized'), [{ type: 'assistant', content: 'partial' }]);

    await expect(executeAgentHarness(makeNode(), makeContext(), { getProvider: () => provider })).rejects.toMatchObject(
      { name: 'PermanentNodeExecutionError' },
    );
  });

  test('classifies a TRANSIENT provider error as a transient (retryable) error', async () => {
    const provider = new ThrowingProvider(new Error('ECONNRESET while streaming'));

    await expect(executeAgentHarness(makeNode(), makeContext(), { getProvider: () => provider })).rejects.toMatchObject(
      { name: 'TransientNodeExecutionError' },
    );
  });

  test('cleans up the scratch dir even when the provider throws mid-stream', async () => {
    let capturedCwd: string | undefined;
    class CapturingThrowingProvider implements IAgentProvider {
      getType(): string {
        return 'fake-capturing';
      }
      getCapabilities(): ProviderCapabilities {
        return FAKE_CAPABILITIES;
      }
      async *sendQuery(_prompt: string, cwd: string): AsyncGenerator<MessageChunk> {
        capturedCwd = cwd;
        yield { type: 'assistant', content: 'x' };
        throw new Error('boom');
      }
    }

    await expect(
      executeAgentHarness(makeNode(), makeContext(), {
        getProvider: () => new CapturingThrowingProvider(),
      }),
    ).rejects.toThrow();

    expect(capturedCwd).toBeDefined();
    await expect(execFileAsync('test', ['-d', capturedCwd!])).rejects.toBeDefined();
  });

  test('does not tear down accumulation early when a result arrives while background_tasks is non-empty', async () => {
    const provider = new FakeProvider(async function* () {
      yield { type: 'assistant', content: 'first turn. ' } as MessageChunk;
      yield { type: 'background_tasks', tasks: [{ taskId: 't1', taskType: 'sub', description: 'd' }] };
      // A `result` chunk while a background task is still live must NOT end the stream.
      yield { type: 'result', sessionId: 's-early' };
      yield { type: 'assistant', content: 'second turn.' };
      yield { type: 'background_tasks', tasks: [] };
      yield { type: 'result', sessionId: 's-final', tokens: { input: 1, output: 1 } };
    });

    const result = await executeAgentHarness(makeNode(), makeContext(), {
      getProvider: () => provider,
    });

    expect(result.output.response).toBe('first turn. second turn.');
  });

  test('assertCheckoutUntouched fails a mutatesCheckout: false node when the working tree changed', async () => {
    const repoDirectory = await mkdtemp(path.join(tmpdir(), 'agent-harness-git-'));
    scratchDirectoriesToClean.push(repoDirectory);
    await execFileAsync('git', ['init', '-q'], { cwd: repoDirectory });
    await execFileAsync('git', ['config', 'user.email', 'test@test.dev'], { cwd: repoDirectory });
    await execFileAsync('git', ['config', 'user.name', 'test'], { cwd: repoDirectory });
    await writeFile(path.join(repoDirectory, 'committed.txt'), 'v1');
    await execFileAsync('git', ['add', '-A'], { cwd: repoDirectory });
    await execFileAsync('git', ['commit', '-q', '-m', 'init'], { cwd: repoDirectory });

    class MutatingProvider implements IAgentProvider {
      getType(): string {
        return 'fake-mutating';
      }
      getCapabilities(): ProviderCapabilities {
        return FAKE_CAPABILITIES;
      }
      async *sendQuery(_prompt: string, cwd: string): AsyncGenerator<MessageChunk> {
        await writeFile(path.join(cwd, 'mutated.txt'), 'unexpected');
        yield { type: 'assistant', content: 'done' };
        yield { type: 'result', sessionId: 's1' };
      }
    }

    await expect(
      executeAgentHarness(
        makeNode({ mutatesCheckout: false }),
        makeContext({ variables: { workdir: repoDirectory } }),
        { getProvider: () => new MutatingProvider() },
      ),
    ).rejects.toMatchObject({ name: 'PermanentNodeExecutionError' });
  });

  test('empty output fails the run', async () => {
    const provider = new FakeProvider([{ type: 'result', sessionId: 's1' }]);

    await expect(executeAgentHarness(makeNode(), makeContext(), { getProvider: () => provider })).rejects.toThrow();
  });

  test('empty prompt fails fast as a permanent error instead of waiting on the idle timeout', async () => {
    const provider = new FakeProvider([{ type: 'assistant', content: 'should never run' }]);

    const start = Date.now();
    await expect(
      executeAgentHarness(makeNode({ prompt: '   ' }), makeContext(), { getProvider: () => provider }),
    ).rejects.toMatchObject({ classification: 'permanent' });
    expect(Date.now() - start).toBeLessThan(1000);
  });

  test('idle timeout with partial output salvages a successful result with a warning (Archon L3087-3135)', async () => {
    class StallingProvider implements IAgentProvider {
      getType(): string {
        return 'fake-stalling';
      }
      getCapabilities(): ProviderCapabilities {
        return FAKE_CAPABILITIES;
      }
      async *sendQuery(): AsyncGenerator<MessageChunk> {
        yield { type: 'assistant', content: 'partial' };
        // Never yields again — the idle timeout must fire and end the stream.
        await new Promise(() => {});
      }
    }

    const start = Date.now();
    const result = await executeAgentHarness(makeNode({ idle_timeout: 200 }), makeContext(), {
      getProvider: () => new StallingProvider(),
    });
    expect(Date.now() - start).toBeLessThan(2000);
    expect(result.output.response).toBe('partial');
    expect(result.output.warnings?.some((w) => w.includes('idle timeout'))).toBe(true);
  });

  test('idle timeout with zero output fails the run', async () => {
    class SilentStallingProvider implements IAgentProvider {
      getType(): string {
        return 'fake-silent-stalling';
      }
      getCapabilities(): ProviderCapabilities {
        return FAKE_CAPABILITIES;
      }
      async *sendQuery(): AsyncGenerator<MessageChunk> {
        await new Promise<void>(() => {});
        yield { type: 'assistant', content: 'unreachable' };
      }
    }

    const start = Date.now();
    await expect(
      executeAgentHarness(makeNode({ idle_timeout: 200 }), makeContext(), {
        getProvider: () => new SilentStallingProvider(),
      }),
    ).rejects.toThrow();
    expect(Date.now() - start).toBeLessThan(2000);
  });
});
