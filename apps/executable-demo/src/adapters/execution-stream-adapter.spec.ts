import { describe, expect, it, vi } from 'vitest';

import { connectExecutionStream, resolveStreamUrl } from './execution-stream-adapter';

class FakeEventSource {
  listeners = new Map<string, ((event: Event) => void)[]>();
  close = vi.fn();

  addEventListener(type: string, listener: EventListenerOrEventListenerObject | null) {
    if (!listener) return;
    const callback = typeof listener === 'function' ? listener : (event: Event) => listener.handleEvent(event);
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), callback]);
  }

  emit(type: string, event: Event) {
    for (const listener of this.listeners.get(type) ?? []) listener(event);
  }
}

function message(data: unknown) {
  return new MessageEvent('message', { data: JSON.stringify(data) });
}

describe('execution stream adapter', () => {
  it('uses same-origin paths by default and preserves absolute stream URLs', () => {
    expect(resolveStreamUrl('/api/executions/1/stream')).toBe('/api/executions/1/stream');
    expect(resolveStreamUrl('https://backend.example/api/stream')).toBe('https://backend.example/api/stream');
  });

  it('applies events and closes only after a terminal event', () => {
    const source = new FakeEventSource();
    const handlers = {
      applySnapshot: vi.fn(),
      applyEvent: vi.fn(),
      applyConnectionLost: vi.fn(),
    };
    connectExecutionStream('/stream', handlers, () => source as unknown as EventSource);

    source.emit(
      'message',
      message({
        executionId: 'e',
        sequence: 1,
        timestamp: new Date().toISOString(),
        type: 'execution_started',
        payload: {},
      }),
    );
    expect(handlers.applyEvent).toHaveBeenCalledTimes(1);
    expect(source.close).not.toHaveBeenCalled();

    source.emit(
      'message',
      message({ executionId: 'e', sequence: 2, timestamp: new Date().toISOString(), type: 'execution_cancelled' }),
    );
    expect(handlers.applyEvent).toHaveBeenCalledTimes(2);
    expect(source.close).toHaveBeenCalledTimes(1);
  });

  it('closes on a terminal snapshot and tolerates malformed frames', () => {
    const source = new FakeEventSource();
    const handlers = {
      applySnapshot: vi.fn(),
      applyEvent: vi.fn(),
      applyConnectionLost: vi.fn(),
    };
    connectExecutionStream('/stream', handlers, () => source as unknown as EventSource);
    source.emit('message', new MessageEvent('message', { data: '{bad' }));
    source.emit(
      'message',
      message({
        type: 'execution_snapshot',
        executionId: 'e',
        status: 'completed',
        lastSequence: 2,
        events: [],
      }),
    );
    expect(handlers.applySnapshot).toHaveBeenCalledTimes(1);
    expect(source.close).toHaveBeenCalledTimes(1);
  });

  it('reports a lost connection after repeated EventSource errors', () => {
    const source = new FakeEventSource();
    const handlers = {
      applySnapshot: vi.fn(),
      applyEvent: vi.fn(),
      applyConnectionLost: vi.fn(),
    };
    connectExecutionStream('/stream', handlers, () => source as unknown as EventSource);
    for (let count = 0; count < 6; count += 1) source.emit('error', new Event('error'));
    expect(source.close).toHaveBeenCalledTimes(1);
    expect(handlers.applyConnectionLost).toHaveBeenCalledTimes(1);
  });
});
