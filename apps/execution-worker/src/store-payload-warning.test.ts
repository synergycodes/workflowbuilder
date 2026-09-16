import { describe, expect, it, vi } from 'vitest';

import { withPayloadSizeWarning } from './store-payload-warning';

function makeStore() {
  return {
    emitExecutionEvent: vi.fn(async () => {}),
    updateExecutionStatus: vi.fn(async () => {}),
  };
}

function makeLogger() {
  return { warn: vi.fn(), info: vi.fn(), error: vi.fn(), debug: vi.fn(), child: vi.fn() };
}

describe('withPayloadSizeWarning', () => {
  it('passes the event through unchanged', async () => {
    const store = makeStore();
    const logger = makeLogger();

    await withPayloadSizeWarning(store, logger as never).emitExecutionEvent(
      'exec-1',
      3,
      'node_started',
      { a: 1 },
      'n1',
    );

    expect(store.emitExecutionEvent).toHaveBeenCalledWith('exec-1', 3, 'node_started', { a: 1 }, 'n1');
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('warns once the payload crosses Temporal’s blob warn threshold, and still stores it', async () => {
    const store = makeStore();
    const logger = makeLogger();
    // Comfortably past 512 KB so the check is unambiguous.
    const payload = { blob: 'x'.repeat(600 * 1024) };

    await withPayloadSizeWarning(store, logger as never).emitExecutionEvent('exec-1', 4, 'node_completed', payload);

    expect(logger.warn).toHaveBeenCalledOnce();
    expect(logger.warn.mock.calls[0][1]).toMatchObject({ executionId: 'exec-1', sequence: 4, type: 'node_completed' });
    // A warning must never cost the event: history stays complete.
    expect(store.emitExecutionEvent).toHaveBeenCalledOnce();
  });

  it('ignores events without a payload', async () => {
    const store = makeStore();
    const logger = makeLogger();

    await withPayloadSizeWarning(store, logger as never).emitExecutionEvent('exec-1', 1, 'execution_started');

    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('forwards status updates untouched', async () => {
    const store = makeStore();
    const logger = makeLogger();

    await withPayloadSizeWarning(store, logger as never).updateExecutionStatus('exec-1', 'failed', 'boom');

    expect(store.updateExecutionStatus).toHaveBeenCalledWith('exec-1', 'failed', 'boom');
  });
});
