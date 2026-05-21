import type { WorkflowEnginePort } from '@workflow-builder/execution-core/workflow';
import type { BaseNode } from '@workflow-builder/types/workflow-execution/execution-model';

import { TemporalEngine } from './temporal-engine';

let engine: WorkflowEnginePort<BaseNode> | undefined;

export function getWorkflowEngine(): WorkflowEnginePort<BaseNode> {
  if (!engine) {
    engine = new TemporalEngine();
  }
  return engine;
}
