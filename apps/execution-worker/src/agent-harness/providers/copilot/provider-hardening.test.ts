/**
 * Hardening tests for CopilotProvider — defensive behaviors that protect
 * against caller-side mistakes, plus the config-translation + warning-
 * emission surface (token precedence, env merge order, not-yet-supported
 * MCP/skills warnings). Trimmed from Archon's `provider-hardening.test.ts`
 * and `provider.test.ts`; skips deep SDK-internals assertions that would
 * require re-mocking large swaths of `@github/copilot-sdk`.
 *
 * Mocks `@github/copilot-sdk` module-wide via `vi.mock` (hoisted).
 */
import type { SessionEvent } from '@github/copilot-sdk';
import { beforeEach, describe, expect, test, vi } from 'vitest';

interface FakeSession {
  sessionId: string;
  prompt?: string;
  aborted: boolean;
  disconnected: boolean;
  listener: ((event: SessionEvent) => void) | undefined;
  fire: (event: SessionEvent) => void;
  resolveSend: (result?: unknown) => void;
  rejectSend: (error: Error) => void;
}

let resolveSendGlobal: (v?: unknown) => void = () => {};
let rejectSendGlobal: (error: Error) => void = () => {};

function makeFakeSession(sessionId = 'sess-hardening'): FakeSession {
  const sendPromise = new Promise<unknown>((resolve, reject) => {
    resolveSendGlobal = resolve;
    rejectSendGlobal = reject;
  });
  const fake: FakeSession = {
    sessionId,
    prompt: undefined,
    aborted: false,
    disconnected: false,
    listener: undefined,
    fire(event) {
      if (this.listener) this.listener(event);
    },
    resolveSend(result) {
      resolveSendGlobal(result);
    },
    rejectSend(error) {
      rejectSendGlobal(error);
    },
  };
  const session = fake as FakeSession & {
    on: (handler: (event: SessionEvent) => void) => () => void;
    sendAndWait: (options: { prompt: string }, timeout?: number) => Promise<unknown>;
    disconnect: () => Promise<void>;
    abort: () => Promise<void>;
  };
  session.on = (handler) => {
    fake.listener = handler;
    return () => {
      fake.listener = undefined;
    };
  };
  session.sendAndWait = async (options) => {
    fake.prompt = options.prompt;
    sendAndWaitCallCount++;
    return sendPromise;
  };
  session.disconnect = async () => {
    fake.disconnected = true;
  };
  session.abort = async () => {
    fake.aborted = true;
  };
  return session as unknown as FakeSession;
}

let sendAndWaitCallCount = 0;
let nextCreateSessionResult: FakeSession | Error;

const createSessionSpy = vi.fn((sessionConfig: { model: string }): Promise<FakeSession> => {
  void sessionConfig;
  if (nextCreateSessionResult instanceof Error) {
    return Promise.reject(nextCreateSessionResult);
  }
  return Promise.resolve(nextCreateSessionResult);
});
const stopSpy = vi.fn(async (): Promise<Error[]> => []);
let capturedClientOptions: Record<string, unknown> | undefined;

async function resumeSessionUnused(): Promise<FakeSession> {
  throw new Error('resumeSession not used in these tests');
}

vi.mock('@github/copilot-sdk', () => ({
  CopilotClient: class FakeCopilotClient {
    createSession = createSessionSpy;
    resumeSession = vi.fn(resumeSessionUnused);
    stop = stopSpy;
    constructor(options: Record<string, unknown>) {
      capturedClientOptions = options;
    }
  },
  approveAll: vi.fn(() => ({ kind: 'approved' })),
}));

const { CopilotProvider } = await import('./provider');

function event_<T extends SessionEvent['type']>(type: T, data: unknown): SessionEvent {
  return {
    id: 'test',
    timestamp: new Date().toISOString(),
    parentId: null,
    type,
    data,
  } as unknown as SessionEvent;
}

async function collect(generator: AsyncGenerator<unknown>): Promise<{ chunks: unknown[]; error?: Error }> {
  const chunks: unknown[] = [];
  try {
    for await (const chunk of generator) chunks.push(chunk);
    return { chunks };
  } catch (error) {
    return { chunks, error: error as Error };
  }
}

describe('CopilotProvider hardening', () => {
  beforeEach(() => {
    sendAndWaitCallCount = 0;
    capturedClientOptions = undefined;
    createSessionSpy.mockClear();
    stopSpy.mockClear();
  });

  test('rejects early when abortSignal is already aborted', async () => {
    const session = makeFakeSession('sess-already-aborted');
    nextCreateSessionResult = session;

    const controller = new AbortController();
    controller.abort();

    const { error } = await collect(
      new CopilotProvider().sendQuery('hi', '/repo', undefined, {
        model: 'gpt-5',
        abortSignal: controller.signal,
      }),
    );

    expect(error).toBeDefined();
    expect(error?.name).toBe('AbortError');
    expect(sendAndWaitCallCount).toBe(0);
  });

  test('trims whitespace from the model before assigning to SessionConfig', async () => {
    const session = makeFakeSession('sess-trim-model');
    nextCreateSessionResult = session;

    const gen = new CopilotProvider().sendQuery('hi', '/repo', undefined, {
      model: '  gpt-5-mini  ',
    });
    const firstNext = gen.next();
    await new Promise((resolve) => setTimeout(resolve, 5));
    session.fire(event_('assistant.message_delta', { messageId: 'm', deltaContent: 'ok' }));
    session.resolveSend();
    await firstNext;
    await collect(gen);

    expect(createSessionSpy).toHaveBeenCalledTimes(1);
    const options = createSessionSpy.mock.calls[0]![0] as { model: string };
    expect(options.model).toBe('gpt-5-mini');
  });

  test('falls back to assistantConfig.model and trims that too', async () => {
    const session = makeFakeSession('sess-fallback-model');
    nextCreateSessionResult = session;

    const gen = new CopilotProvider().sendQuery('hi', '/repo', undefined, {
      assistantConfig: { model: '  gpt-5  ' },
    });
    const firstNext = gen.next();
    await new Promise((resolve) => setTimeout(resolve, 5));
    session.fire(event_('assistant.message_delta', { messageId: 'm', deltaContent: 'ok' }));
    session.resolveSend();
    await firstNext;
    await collect(gen);

    const options = createSessionSpy.mock.calls[0]![0] as { model: string };
    expect(options.model).toBe('gpt-5');
  });

  test('COPILOT_GITHUB_TOKEN wins over generic GH_TOKEN/GITHUB_TOKEN', async () => {
    const session = makeFakeSession('sess-token-precedence');
    nextCreateSessionResult = session;

    const gen = new CopilotProvider().sendQuery('hi', '/repo', undefined, {
      model: 'gpt-5',
      env: { COPILOT_GITHUB_TOKEN: 'copilot-pat', GH_TOKEN: 'generic-pat' },
    });
    const firstNext = gen.next();
    await new Promise((resolve) => setTimeout(resolve, 5));
    session.fire(event_('assistant.message_delta', { messageId: 'm', deltaContent: 'ok' }));
    session.resolveSend();
    await firstNext;
    await collect(gen);

    expect(capturedClientOptions?.gitHubToken).toBe('copilot-pat');
    expect(capturedClientOptions?.useLoggedInUser).toBe(false);
  });

  test('request env wins over process.env for the same key', async () => {
    const session = makeFakeSession('sess-env-merge');
    nextCreateSessionResult = session;
    const originalValue = process.env.COPILOT_GITHUB_TOKEN;
    process.env.COPILOT_GITHUB_TOKEN = 'from-process-env';

    try {
      const gen = new CopilotProvider().sendQuery('hi', '/repo', undefined, {
        model: 'gpt-5',
        env: { COPILOT_GITHUB_TOKEN: 'from-request-env' },
      });
      const firstNext = gen.next();
      await new Promise((resolve) => setTimeout(resolve, 5));
      session.fire(event_('assistant.message_delta', { messageId: 'm', deltaContent: 'ok' }));
      session.resolveSend();
      await firstNext;
      await collect(gen);

      expect(capturedClientOptions?.gitHubToken).toBe('from-request-env');
    } finally {
      if (originalValue === undefined) delete process.env.COPILOT_GITHUB_TOKEN;
      else process.env.COPILOT_GITHUB_TOKEN = originalValue;
    }
  });

  test('emits a not-yet-supported warning for nodeConfig.mcp instead of silently dropping it', async () => {
    const session = makeFakeSession('sess-mcp-warning');
    nextCreateSessionResult = session;

    const gen = new CopilotProvider().sendQuery('hi', '/repo', undefined, {
      model: 'gpt-5',
      nodeConfig: { mcp: '/path/to/mcp.json' },
    });
    const firstNext = gen.next();
    await new Promise((resolve) => setTimeout(resolve, 5));
    session.fire(event_('assistant.message_delta', { messageId: 'm', deltaContent: 'ok' }));
    session.resolveSend();
    const firstResult = await firstNext;
    const { chunks: rest } = await collect(gen);
    const chunks = firstResult.value === undefined ? rest : [firstResult.value, ...rest];

    expect(chunks).toContainEqual(expect.objectContaining({ type: 'system', content: expect.stringContaining('MCP') }));
  });

  test('emits a not-yet-supported warning for nodeConfig.maxBudgetUsd instead of silently dropping it', async () => {
    const session = makeFakeSession('sess-budget-warning');
    nextCreateSessionResult = session;

    const gen = new CopilotProvider().sendQuery('hi', '/repo', undefined, {
      model: 'gpt-5',
      nodeConfig: { maxBudgetUsd: 5 },
    });
    const firstNext = gen.next();
    await new Promise((resolve) => setTimeout(resolve, 5));
    session.fire(event_('assistant.message_delta', { messageId: 'm', deltaContent: 'ok' }));
    session.resolveSend();
    const firstResult = await firstNext;
    const { chunks: rest } = await collect(gen);
    const chunks = firstResult.value === undefined ? rest : [firstResult.value, ...rest];

    expect(chunks).toContainEqual(
      expect.objectContaining({ type: 'system', content: expect.stringContaining('maxBudgetUsd') }),
    );
  });

  test('does NOT emit a spurious session-error warning when fallback assistant content was delivered', async () => {
    const session = makeFakeSession('sess-fallback-after-error');
    nextCreateSessionResult = session;

    const gen = new CopilotProvider().sendQuery('hi', '/repo', undefined, { model: 'gpt-5' });
    const firstNext = gen.next();
    await new Promise((resolve) => setTimeout(resolve, 5));

    session.fire(event_('session.error', { errorType: 'transient', message: 'some transient error' }));
    session.resolveSend({ data: { content: 'FALLBACK', messageId: 'final' } });

    const firstResult = await firstNext;
    const { chunks: rest, error } = await collect(gen);
    const chunks: unknown[] = [];
    if (firstResult.value !== undefined) chunks.push(firstResult.value);
    chunks.push(...rest);

    expect(error).toBeUndefined();
    expect(chunks).toContainEqual(expect.objectContaining({ type: 'assistant', content: 'FALLBACK' }));
    expect(chunks).not.toContainEqual(
      expect.objectContaining({
        type: 'system',
        content: expect.stringContaining('some transient error'),
      }),
    );
  });

  test('cleanup failure in client.stop does not mask the friendly primary error', async () => {
    const session = makeFakeSession('sess-stop-fails');
    nextCreateSessionResult = session;
    stopSpy.mockImplementationOnce(async () => {
      throw new Error('client.stop blew up');
    });

    const gen = new CopilotProvider().sendQuery('hi', '/repo', undefined, { model: 'gpt-5' });
    const firstNext = gen.next();
    await new Promise((resolve) => setTimeout(resolve, 5));
    session.rejectSend(new Error('Model not available'));

    let primaryError: Error | undefined;
    try {
      await firstNext;
    } catch (error) {
      primaryError = error as Error;
    }
    if (!primaryError) {
      const { error } = await collect(gen);
      primaryError = error;
    }

    expect(primaryError?.message).toMatch(/Copilot model access error/i);
    expect(primaryError?.message ?? '').not.toContain('client.stop blew up');
  });
});
