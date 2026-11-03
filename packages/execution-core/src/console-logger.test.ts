import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createConsoleLogger } from './console-logger';

type ConsoleSpy = ReturnType<typeof vi.spyOn>;

let spies: Record<'debug' | 'info' | 'warn' | 'error', ConsoleSpy>;

beforeEach(() => {
  spies = {
    debug: vi.spyOn(console, 'debug').mockImplementation(() => {}),
    info: vi.spyOn(console, 'info').mockImplementation(() => {}),
    warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
    error: vi.spyOn(console, 'error').mockImplementation(() => {}),
  };
});

afterEach(() => {
  vi.restoreAllMocks();
});

function getLine(level: keyof typeof spies, call = 0): Record<string, unknown> {
  const raw = spies[level].mock.calls[call]?.[0];
  if (typeof raw !== 'string') throw new Error(`expected string log line, got ${typeof raw}`);
  return JSON.parse(raw) as Record<string, unknown>;
}

describe('createConsoleLogger', () => {
  it('routes each level to the matching console method', () => {
    const logger = createConsoleLogger();
    logger.debug('d');
    logger.info('i');
    logger.warn('w');
    logger.error('e');

    expect(spies.debug).toHaveBeenCalledTimes(1);
    expect(spies.info).toHaveBeenCalledTimes(1);
    expect(spies.warn).toHaveBeenCalledTimes(1);
    expect(spies.error).toHaveBeenCalledTimes(1);
    expect(getLine('debug').level).toBe('debug');
    expect(getLine('info').level).toBe('info');
    expect(getLine('warn').level).toBe('warn');
    expect(getLine('error').level).toBe('error');
  });

  it('emits JSON with level/time/msg + initial bindings + per-call extras', () => {
    const logger = createConsoleLogger({ component: 'backend' });
    logger.info('hello', { requestId: 'r-1' });

    const line = getLine('info');
    expect(line.msg).toBe('hello');
    expect(line.level).toBe('info');
    expect(typeof line.time).toBe('string');
    expect(line.component).toBe('backend');
    expect(line.requestId).toBe('r-1');
  });

  it('child merges parent bindings under its own — per-call extras win over both', () => {
    const root = createConsoleLogger({ component: 'backend', layer: 'root' });
    const child = root.child({ layer: 'route', requestId: 'r-1' });
    child.warn('boom', { layer: 'per-call' });

    const line = getLine('warn');
    expect(line.component).toBe('backend');
    expect(line.requestId).toBe('r-1');
    // layering precedence: initial → child → per-call (last one wins)
    expect(line.layer).toBe('per-call');
  });

  it('grandchild stacks bindings from every ancestor', () => {
    const root = createConsoleLogger({ a: 1 });
    const child = root.child({ b: 2 });
    const grandchild = child.child({ c: 3 });
    grandchild.error('x');

    const line = getLine('error');
    expect(line.a).toBe(1);
    expect(line.b).toBe(2);
    expect(line.c).toBe(3);
  });

  it('does not mutate the parent logger when child adds bindings', () => {
    const root = createConsoleLogger({ component: 'backend' });
    root.child({ requestId: 'r-1' });
    root.info('hi');

    const line = getLine('info');
    expect(line.requestId).toBeUndefined();
    expect(line.component).toBe('backend');
  });

  it('pretty=true emits a human-readable single line instead of JSON', () => {
    const logger = createConsoleLogger({ component: 'backend' }, { pretty: true });
    logger.info('hello', { requestId: 'r-1' });

    const raw = spies.info.mock.calls[0]?.[0];
    expect(typeof raw).toBe('string');
    expect(raw).toMatch(/^\d{4}-\d{2}-\d{2}T.*Z INFO {2}hello {2}\{"component":"backend","requestId":"r-1"\}$/);
  });

  it('pretty option propagates through child', () => {
    const root = createConsoleLogger({ component: 'backend' }, { pretty: true });
    const child = root.child({ requestId: 'r-1' });
    child.warn('w');

    const raw = spies.warn.mock.calls[0]?.[0];
    expect(typeof raw).toBe('string');
    expect(raw).toMatch(/WARN {2}w {2}\{"component":"backend","requestId":"r-1"\}$/);
  });
});
