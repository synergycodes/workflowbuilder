import { Context } from '@temporalio/activity';
import { spawn } from 'node:child_process';
import { once } from 'node:events';

import type { BaseNode, NodeExecutorRegistry } from '../../src/index';

export type ShellNode = BaseNode & { type: 'test/shell'; config: { seconds: number; heartbeat: boolean } };

export function createShellExecutor() {
  const processes: { pid: number; closed: boolean; cancelled: boolean }[] = [];
  const controllers = new Set<AbortController>();
  const outputs: string[] = [];
  const inputs: Record<string, Record<string, unknown>> = {};

  const executors: NodeExecutorRegistry<ShellNode> = {
    'test/shell': async (node, context) => {
      inputs[node.id] = { ...context.nodeOutputs };
      const activity = Context.current();
      const controller = new AbortController();
      controllers.add(controller);
      const cancel = () => controller.abort();
      activity.cancellationSignal.addEventListener('abort', cancel, { once: true });
      if (activity.cancellationSignal.aborted) cancel();
      const child = spawn('sh', ['-c', `exec sleep ${node.config.seconds}`], { signal: controller.signal });
      const process = { pid: child.pid!, closed: false, cancelled: false };
      processes.push(process);
      // An abort emits error before close; observe both so cleanup waits for the real process exit.
      const failure = new Promise<Error>((resolve) => child.once('error', resolve));
      const closed = new Promise<void>((resolve) =>
        child.once('close', () => {
          process.closed = true;
          resolve();
        }),
      );
      activity.heartbeat({ nodeId: node.id });
      const timer = node.config.heartbeat ? setInterval(() => activity.heartbeat({ nodeId: node.id }), 100) : undefined;
      try {
        const exit = once(child, 'exit').then(([code]) => {
          if (code !== 0) throw new Error(`shell exited with code ${String(code)}`);
        });
        await Promise.race([
          exit,
          failure.then((error) => {
            throw error;
          }),
        ]);
        outputs.push(node.id);
        return { output: node.id };
      } finally {
        clearInterval(timer);
        process.cancelled = activity.cancellationSignal.aborted;
        activity.cancellationSignal.removeEventListener('abort', cancel);
        controller.abort();
        await closed;
        controllers.delete(controller);
      }
    },
  };

  return {
    executors,
    processes,
    outputs,
    inputs,
    stop: () => {
      for (const controller of controllers) controller.abort();
    },
  };
}
