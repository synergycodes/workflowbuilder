import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { resetExecution, setExecutionStarted, useExecutionStore } from '../stores/use-execution-store';
import { installFakeEventSource, latestStream } from '../test/fake-event-source';
import { MAX_RETRIES, connectExecutionStream } from './execution-stream-adapter';

const STREAM_URL = '/api/executions/exec-1/stream';

const runStatus = () => useExecutionStore.getState().status;

function connectWaitingRun() {
  setExecutionStarted('exec-1', STREAM_URL);
  useExecutionStore.setState({ status: 'waiting' });
  connectExecutionStream('exec-1', STREAM_URL);
  return latestStream();
}

describe('connectExecutionStream: when the stream cannot be read', () => {
  beforeEach(() => {
    installFakeEventSource();
    resetExecution();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('a refused stream is lost at once, but keeps the run id for Stop to resolve', () => {
    const stream = connectWaitingRun();

    stream.refuse();

    expect(runStatus()).toBe('disconnected');
    expect(stream.closed).toBe(true);
    expect(useExecutionStore.getState().executionId).toBe('exec-1');
    expect(useExecutionStore.getState().streamUrl).toBe(STREAM_URL);
  });

  it('the browser is given MAX_RETRIES attempts before the run is called lost', () => {
    const stream = connectWaitingRun();

    for (let attempt = 0; attempt < MAX_RETRIES; attempt += 1) {
      stream.blip();
    }

    expect(runStatus()).toBe('waiting');
    expect(stream.closed).toBe(false);

    stream.blip();

    expect(runStatus()).toBe('disconnected');
    expect(stream.closed).toBe(true);
  });

  it('a message between blips restores the patience', () => {
    const stream = connectWaitingRun();

    for (let attempt = 0; attempt < 4; attempt += 1) {
      stream.blip();
    }
    // node_started would re-derive the run to running.
    stream.emit({
      executionId: 'exec-1',
      sequence: 1,
      timestamp: '2026-09-15T12:00:00.000Z',
      type: 'node_waiting',
      nodeId: 'human-1',
    });
    for (let attempt = 0; attempt < 4; attempt += 1) {
      stream.blip();
    }

    expect(runStatus()).toBe('waiting');
  });
});

// The server ends the response right after a terminal frame. A source left open reconnects every few seconds,
// is answered with the same frame, and the answer resets the retry count, so nothing ever stops it.
describe('connectExecutionStream: when the run is over', () => {
  beforeEach(() => {
    installFakeEventSource();
    resetExecution();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('a terminal snapshot ends the stream: the server has nothing more to send', () => {
    const stream = connectWaitingRun();

    stream.emit({
      type: 'execution_snapshot',
      executionId: 'exec-1',
      status: 'completed',
      lastSequence: 0,
      events: [],
    });

    expect(runStatus()).toBe('completed');
    expect(stream.closed).toBe(true);
  });

  it('a terminal event ends the stream too, for a run that was still live', () => {
    const stream = connectWaitingRun();

    stream.emit({
      executionId: 'exec-1',
      sequence: 1,
      timestamp: '2026-09-15T12:00:00.000Z',
      type: 'execution_completed',
    });

    expect(stream.closed).toBe(true);
  });
});
