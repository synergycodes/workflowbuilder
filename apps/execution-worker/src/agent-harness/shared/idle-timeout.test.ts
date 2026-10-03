import { describe, expect, it, vi } from 'vitest';

import { withIdleTimeout } from './idle-timeout';

async function* stalledGenerator(stallMs: number): AsyncGenerator<number> {
  yield 1;
  await new Promise((resolve) => setTimeout(resolve, stallMs));
  yield 2;
}

async function* steadyGenerator(count: number, intervalMs: number): AsyncGenerator<number> {
  for (let index = 0; index < count; index++) {
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
    yield index;
  }
}

describe('withIdleTimeout', () => {
  it('aborts a generator that stalls past the idle window', async () => {
    const onTimeout = vi.fn();
    const values: number[] = [];

    for await (const value of withIdleTimeout(stalledGenerator(200), 30, onTimeout)) {
      values.push(value);
    }

    expect(values).toEqual([1]);
    expect(onTimeout).toHaveBeenCalledTimes(1);
  });

  it('does not abort a generator that yields steadily within the idle window', async () => {
    const onTimeout = vi.fn();
    const values: number[] = [];

    for await (const value of withIdleTimeout(steadyGenerator(5, 10), 100, onTimeout)) {
      values.push(value);
    }

    expect(values).toEqual([0, 1, 2, 3, 4]);
    expect(onTimeout).not.toHaveBeenCalled();
  });
});
