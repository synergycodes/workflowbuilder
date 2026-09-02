import { SimplePlugin } from '@temporalio/plugin';

import { type CreateActivitiesOptions, createActivities } from './activities';
import { DEFAULT_TASK_QUEUE } from './constants';
import type { BaseNode, LoggerPort } from './core-contract';
import type { NodeActivityProfiles } from './workflow/activity-profiles';
import { assertNodeActivityProfiles } from './workflow/node-activity-options';

export type WorkflowBuilderPluginOptions<TNode extends BaseNode> = CreateActivitiesOptions<TNode> & {
  // Defaults to DEFAULT_TASK_QUEUE. Read it back off the plugin (`plugin.taskQueue`)
  // when creating the Worker so the queue is named in exactly one place.
  taskQueue?: string;

  // Never read here. Taken only so a bad profile fails `Worker.create` rather than the
  // first workflow activation, and so keys can be checked against `executors`.
  nodeActivityProfiles?: NodeActivityProfiles;

  // Where the profile-key warning goes. Falls back to console, which a worker with a
  // structured sink would not be watching.
  logger?: LoggerPort;
};

// Shows up in users' worker logs and is part of what Temporal reviews, so it changes
// deliberately (a test pins it). Not the npm package name: their Technical Review
// Standards ask for the `my_library.MyPlugin` format.
const PLUGIN_NAME = 'workflowbuilder.WorkflowBuilderPlugin';

// Registers the activities that execute a Workflow Builder graph on Temporal.
//
// What it deliberately does NOT do:
//   - bundle the workflow. The TypeScript SDK builds the workflow bundle from a
//     single module, so setting `workflowsPath` here would take that slot away from
//     the consumer. They re-export `runWorkflow` from their own workflows file
//     instead — the same pattern Temporal's own AI SDK plugin uses.
//   - open the connection. Connection, TLS and credentials stay with the consumer.
//   - own storage. Persistence arrives as the `store` port.
export class WorkflowBuilderPlugin<TNode extends BaseNode = BaseNode> extends SimplePlugin {
  // The queue this plugin's activities are meant to be served on.
  readonly taskQueue: string;

  constructor(options: WorkflowBuilderPluginOptions<TNode>) {
    super({
      name: PLUGIN_NAME,
      // SimplePlugin appends these to whatever the consumer registered themselves,
      // so a worker can serve its own activities alongside these three.
      activities: createActivities(options),
    });

    this.taskQueue = options.taskQueue ?? DEFAULT_TASK_QUEUE;

    if (options.nodeActivityProfiles !== undefined) {
      assertNodeActivityProfiles(options.nodeActivityProfiles);
      warnOnProfilesWithoutExecutor(options.nodeActivityProfiles, options.executors, options.logger);
    }
  }
}

// The one config mistake the sandbox cannot see, since the workflow has no registry.
// Warned, not thrown: one bundle may serve workers registering different subsets.
function warnOnProfilesWithoutExecutor(
  profiles: NodeActivityProfiles,
  executors: object,
  logger: LoggerPort | undefined,
): void {
  const unknown = Object.keys(profiles).filter((nodeType) => !Object.hasOwn(executors, nodeType));
  if (unknown.length === 0) return;

  const message =
    `nodeActivityProfiles has no matching executor for ${unknown.map((type) => JSON.stringify(type)).join(', ')}. ` +
    `Nodes of those types keep the default profile. Check the spelling against the executors registered on this worker.`;

  if (logger) {
    logger.warn(message, { plugin: PLUGIN_NAME, nodeTypes: unknown });
  } else {
    console.warn(`[${PLUGIN_NAME}] ${message}`);
  }
}
