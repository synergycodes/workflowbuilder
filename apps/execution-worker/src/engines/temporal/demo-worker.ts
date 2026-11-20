import { NativeConnection, Worker } from '@temporalio/worker';
import type { LanguageModel } from 'ai';
import 'dotenv/config';
import { fileURLToPath } from 'node:url';

import {
  type ExecutionContext,
  NodeExecutionError,
  type NodeExecutorRegistry,
  resolveExecutor,
} from '@workflow-builder/execution-core';
import {
  DEMO_WORKFLOW_TASK_QUEUE,
  type DemoExecutionNode,
} from '@workflow-builder/types/workflow-execution/demo-execution';

import { executeDemoAiAgent } from '../../activities/demo-ai-agent';
import { database } from '../../database';
import { DemoNodeValidationError, validateDemoNode } from '../../domain/demo-node-validation';
import { env } from '../../env';
import {
  executeDemoAction,
  executeDemoConditional,
  executeDemoDecision,
  executeDemoMultiPort,
  executeDemoNotification,
  executeDemoTrigger,
} from '../../executors/demo-nodes';
import { logger } from '../../logger';
import { bridgeNodeExecutionError } from './node-execution-error-bridge';

const demoAiLogger = logger.child({ component: 'demo-ai-agent' });

const nodeExecutors: NodeExecutorRegistry<DemoExecutionNode> = {
  trigger: executeDemoTrigger,
  action: executeDemoAction,
  delay: () => {
    throw new NodeExecutionError(
      'invalid_demo_delay_execution',
      'Delay nodes must execute inside the Temporal workflow',
    );
  },
  conditional: executeDemoConditional,
  decision: executeDemoDecision,
  notification: executeDemoNotification,
  'ai-agent': (node, context) =>
    executeDemoAiAgent(node, context, {
      apiKey: env.OPENROUTER_API_KEY,
      modelId: env.AI_MODEL,
      createModel: (apiKey, modelId) => createOpenRouterModel(apiKey, modelId),
      logger: demoAiLogger,
    }),
  'multi-port': executeDemoMultiPort,
};

let modelPromise: Promise<LanguageModel> | undefined;

async function createOpenRouterModel(apiKey: string, modelId: string): Promise<LanguageModel> {
  modelPromise ??= import('@openrouter/ai-sdk-provider').then(({ createOpenRouter }) =>
    createOpenRouter({ apiKey }).chat(modelId),
  );
  return modelPromise;
}

const activities = {
  async executeNode(rawNode: DemoExecutionNode, context: ExecutionContext) {
    let node: DemoExecutionNode;
    try {
      node = validateDemoNode(rawNode);
    } catch (error) {
      if (error instanceof DemoNodeValidationError) {
        throw new NodeExecutionError(error.code, error.message, { cause: error });
      }
      throw error;
    }
    const executor = resolveExecutor(nodeExecutors, node);
    try {
      return await executor(node, context);
    } catch (error) {
      throw bridgeNodeExecutionError(error);
    }
  },

  async emitEvent(executionId: string, sequence: number, type: string, payload?: unknown, nodeId?: string) {
    await database.emitExecutionEvent(executionId, sequence, type, payload, nodeId);
  },

  async updateStatus(executionId: string, status: string, errorMessage?: string) {
    await database.updateExecutionStatus(executionId, status, errorMessage);
  },
};

const connection = await NativeConnection.connect({ address: env.TEMPORAL_ADDRESS });
const worker = await Worker.create({
  connection,
  workflowsPath: fileURLToPath(new URL('workflows/run-demo-workflow.ts', import.meta.url)),
  activities,
  taskQueue: DEMO_WORKFLOW_TASK_QUEUE,
});

logger.info('demo execution worker started', { taskQueue: DEMO_WORKFLOW_TASK_QUEUE });
await worker.run();
