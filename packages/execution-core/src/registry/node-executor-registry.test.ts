import { describe, expect, it } from 'vitest';

import type { BaseNode } from '@workflow-builder/types/workflow-execution/execution-model';

import { type NodeExecutorRegistry, resolveExecutor } from './node-executor-registry';

type TestNode = BaseNode & { type: 'test/echo' };

const registry: NodeExecutorRegistry<TestNode> = {
  'test/echo': (node) => ({ output: node.id }),
};

describe('resolveExecutor', () => {
  it('returns the executor registered for the node type', () => {
    const executor = resolveExecutor(registry, { id: 'n1', type: 'test/echo', config: {} });

    expect(executor({ id: 'n1', type: 'test/echo', config: {} }, {} as never)).toEqual({ output: 'n1' });
  });

  it('names the missing type instead of returning undefined', () => {
    expect(() => resolveExecutor(registry, { id: 'n1', type: 'test/absent', config: {} } as never)).toThrow(
      'No executor registered for node type: test/absent',
    );
  });

  it('does not resolve a node type off Object.prototype', () => {
    // `registry['constructor']` is the Object function: truthy, and callable, so a
    // plain lookup handed it to the runner as this node's executor.
    for (const type of ['constructor', 'toString', 'valueOf', '__proto__']) {
      expect(() => resolveExecutor(registry, { id: 'n1', type, config: {} } as never)).toThrow(
        `No executor registered for node type: ${type}`,
      );
    }
  });
});
