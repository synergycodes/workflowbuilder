// Guards the two types src/workflow/core-contract.ts restates instead of re-exporting
// (see the comment there). They are the shape the reference backend hands to Temporal
// and the graph runner consumes, so a drift between this package and execution-core
// would be a runtime mismatch that no other test would catch. Assignability is
// checked in both directions, so adding *or* removing a field on either side fails to
// compile.
import { describe, expect, it } from 'vitest';

import type {
  WorkflowEnginePort as CoreWorkflowEnginePort,
  WorkflowExecutionInput as CoreWorkflowExecutionInput,
} from '../../execution-core/src/ports/workflow-engine.port';
import type {
  NodeExecutor as CoreNodeExecutor,
  NodeExecutorRegistry as CoreNodeExecutorRegistry,
} from '../../execution-core/src/registry/node-executor-registry';
import type {
  BaseNode,
  NodeExecutor,
  NodeExecutorRegistry,
  WorkflowEnginePort,
  WorkflowExecutionInput,
} from '../src/core-contract';

type MutuallyAssignable<A, B> = [A] extends [B] ? ([B] extends [A] ? true : never) : never;

type TestNode = BaseNode & { type: 'test/node' };

const inputMatchesCore: MutuallyAssignable<
  WorkflowExecutionInput<BaseNode>,
  CoreWorkflowExecutionInput<BaseNode>
> = true;

const portMatchesCore: MutuallyAssignable<WorkflowEnginePort<BaseNode>, CoreWorkflowEnginePort<BaseNode>> = true;

const executorMatchesCore: MutuallyAssignable<NodeExecutor<TestNode>, CoreNodeExecutor<TestNode>> = true;

const registryMatchesCore: MutuallyAssignable<
  NodeExecutorRegistry<TestNode>,
  CoreNodeExecutorRegistry<TestNode>
> = true;

describe('published contract vs execution-core', () => {
  it('states the same input, engine port and executor registry as the core', () => {
    // The real assertions are the declarations above: if any type drifts, this file
    // stops compiling and `pnpm typecheck` fails. The runtime check just keeps the
    // constants referenced.
    expect(inputMatchesCore && portMatchesCore && executorMatchesCore && registryMatchesCore).toBe(true);
  });
});
