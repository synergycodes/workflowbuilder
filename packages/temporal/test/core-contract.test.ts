// Guards the types src/workflow/core-contract.ts restates instead of re-exporting (see
// the comment there). They are the shape the reference backend hands to Temporal and
// the graph runner consumes, so a drift between this package and execution-core would
// be a runtime mismatch that no other test would catch. Assignability is checked in
// both directions, so a required member added or removed on either side fails to
// compile. An optional member or parameter slips through that check, so every restated
// object also has a `keyof` pin and every method a `Parameters` pin.
import { describe, expect, it } from 'vitest';

import type {
  CompletedNodeExecution as CoreCompletedNodeExecution,
  NodeExecutionResult as CoreNodeExecutionResult,
  WaitingNodeExecution as CoreWaitingNodeExecution,
} from '../../execution-core/src/ports/activity-runner.port';
import type { EventEmitterPort as CoreEventEmitterPort } from '../../execution-core/src/ports/event-emitter.port';
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
  CompletedNodeExecution,
  NodeExecutionResult,
  NodeExecutor,
  NodeExecutorRegistry,
  WaitingNodeExecution,
  WorkflowEnginePort,
  WorkflowExecutionInput,
} from '../src/core-contract';
import type { EventEmitterPort } from '../src/workflow/core-contract';

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

const emitterMatchesCore: MutuallyAssignable<EventEmitterPort, CoreEventEmitterPort> = true;

// Optional trailing parameters are mutually assignable whatever their count, so the pin
// above cannot see one added on one side only; the parameter tuples can.
const emitterStatusParamsMatchCore: MutuallyAssignable<
  Parameters<EventEmitterPort['updateStatus']>,
  Parameters<CoreEventEmitterPort['updateStatus']>
> = true;
const emitterEmitParamsMatchCore: MutuallyAssignable<
  Parameters<EventEmitterPort['emitEvent']>,
  Parameters<CoreEventEmitterPort['emitEvent']>
> = true;
const enginePortParamsMatchCore: MutuallyAssignable<
  [
    Parameters<WorkflowEnginePort<BaseNode>['submit']>,
    Parameters<WorkflowEnginePort<BaseNode>['cancel']>,
    Parameters<WorkflowEnginePort<BaseNode>['resolveNode']>,
  ],
  [
    Parameters<CoreWorkflowEnginePort<BaseNode>['submit']>,
    Parameters<CoreWorkflowEnginePort<BaseNode>['cancel']>,
    Parameters<CoreWorkflowEnginePort<BaseNode>['resolveNode']>,
  ]
> = true;
const executorParamsMatchCore: MutuallyAssignable<
  Parameters<NodeExecutor<TestNode>>,
  Parameters<CoreNodeExecutor<TestNode>>
> = true;
const inputKeysMatchCore: MutuallyAssignable<
  keyof WorkflowExecutionInput<BaseNode>,
  keyof CoreWorkflowExecutionInput<BaseNode>
> = true;
const waitingKeysMatchCore: MutuallyAssignable<keyof WaitingNodeExecution, keyof CoreWaitingNodeExecution> = true;

// The `keyof` pin catches an optional field present on one side only, which the object pin misses.
const completionMatchesCore: MutuallyAssignable<CompletedNodeExecution, CoreCompletedNodeExecution> = true;
const completionKeysMatchCore: MutuallyAssignable<keyof CompletedNodeExecution, keyof CoreCompletedNodeExecution> =
  true;
const waitingMatchesCore: MutuallyAssignable<WaitingNodeExecution, CoreWaitingNodeExecution> = true;
const resultMatchesCore: MutuallyAssignable<NodeExecutionResult, CoreNodeExecutionResult> = true;

describe('published contract vs execution-core', () => {
  it('states the same input, engine port, executor registry and completion shapes as the core', () => {
    // The real assertions are the declarations above: if any type drifts, this file
    // stops compiling and `pnpm typecheck` fails. The runtime check just keeps the
    // constants referenced.
    expect(
      inputMatchesCore &&
        portMatchesCore &&
        executorMatchesCore &&
        registryMatchesCore &&
        emitterMatchesCore &&
        emitterStatusParamsMatchCore &&
        emitterEmitParamsMatchCore &&
        enginePortParamsMatchCore &&
        executorParamsMatchCore &&
        inputKeysMatchCore &&
        waitingKeysMatchCore &&
        completionMatchesCore &&
        completionKeysMatchCore &&
        waitingMatchesCore &&
        resultMatchesCore,
    ).toBe(true);
  });
});
