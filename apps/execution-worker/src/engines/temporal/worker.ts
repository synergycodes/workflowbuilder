import { NativeConnection, Worker } from '@temporalio/worker';
import 'dotenv/config';
import { fileURLToPath } from 'node:url';

import { type ExecutionContext, type NodeExecutorRegistry, resolveExecutor } from '@workflow-builder/execution-core';

import { executeAiAgent } from '../../activities/ai-agent';
import { database } from '../../database';
import type { AiStudioNode } from '../../domain/ai-studio-nodes';
import { env } from '../../env';
import { executeDecision } from '../../executors/decision';
import { executeTrigger } from '../../executors/trigger';
import { logger } from '../../logger';

const { createOpenRouter } = await import('@openrouter/ai-sdk-provider');

const taskQueue = 'workflow-execution';

const openrouter = createOpenRouter({ apiKey: env.OPENROUTER_API_KEY });
const model = openrouter.chat(env.AI_MODEL);

const aiAgentLogger = logger.child({ component: 'ai-agent' });

const nodeExecutors: NodeExecutorRegistry<AiStudioNode> = {
  'ai-studio/trigger': executeTrigger,
  'ai-studio/decision': executeDecision,
  'ai-studio/ai-agent': (node, context) => executeAiAgent(node, context, { model, logger: aiAgentLogger }),
};

const activities = {
  async executeNode(node: AiStudioNode, context: ExecutionContext) {
    const executor = resolveExecutor(nodeExecutors, node);
    return executor(node, context);
  },

  async emitEvent(executionId: string, type: string, payload?: unknown, nodeId?: string) {
    await database.emitExecutionEvent(executionId, type, payload, nodeId);
  },

  async updateStatus(executionId: string, status: string, errorMessage?: string) {
    await database.updateExecutionStatus(executionId, status, errorMessage);
  },
};

// without an explicit connection, Worker.create dials 127.0.0.1:7233 and ignores TEMPORAL_ADDRESS
const connection = await NativeConnection.connect({ address: env.TEMPORAL_ADDRESS });

const worker = await Worker.create({
  connection,
  workflowsPath: fileURLToPath(new URL('workflows/run-workflow.ts', import.meta.url)),
  activities,
  taskQueue,
});

logger.info('execution worker started', { taskQueue });
await worker.run();
