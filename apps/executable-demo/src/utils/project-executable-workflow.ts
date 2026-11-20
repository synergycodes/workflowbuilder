import type { IntegrationDataFormat } from '@workflowbuilder/sdk';

import type { NodeErrorPolicy } from '@workflow-builder/types/workflow-execution/execution-model';

export const EXECUTABLE_NODE_TYPES = [
  'trigger',
  'action',
  'delay',
  'conditional',
  'decision',
  'notification',
  'ai-agent',
  'multi-port',
] as const;

export type ExecutableNodeType = (typeof EXECUTABLE_NODE_TYPES)[number];

export type ProjectedNode = {
  id: string;
  data: {
    type: ExecutableNodeType;
    isStartNode?: true;
    properties: Record<string, unknown>;
  };
};

export type ProjectedEdge = {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
};

export type ProjectedWorkflow = {
  nodes: ProjectedNode[];
  edges: ProjectedEdge[];
  globalVariables?: IntegrationDataFormat['globalVariables'];
};

type CanvasNode = {
  id?: unknown;
  data?: {
    type?: unknown;
    isStartNode?: unknown;
    properties?: unknown;
  };
};

type CanvasEdge = {
  id?: unknown;
  source?: unknown;
  target?: unknown;
  sourceHandle?: unknown;
};

type Condition = {
  x: string;
  comparisonOperator: string;
  y: string;
  logicalOperator?: string;
};

type DecisionBranch = {
  id: string;
  sourceHandle: string;
  label: string;
  conditions: Condition[];
};

const NODE_TYPES: ReadonlySet<string> = new Set(EXECUTABLE_NODE_TYPES);
const ERROR_POLICIES: ReadonlySet<string> = new Set(['fail', 'continue', 'errorRoute'] satisfies NodeErrorPolicy[]);
const DELAY_UNITS: ReadonlySet<string> = new Set(['seconds', 'minutes', 'hours']);
const DELAY_UNIT_MS: Record<string, number> = { seconds: 1000, minutes: 60_000, hours: 3_600_000 };
const MAX_DELAY_MS = 24 * 60 * 60 * 1000;
const CONDITIONAL_HANDLES: ReadonlySet<string> = new Set(['true', 'false']);
export const DEFAULT_DECISION_HANDLE = 'default';

export class WorkflowProjectionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WorkflowProjectionError';
  }
}

/**
 * Projects editor state onto the backend's minimal execution snapshot.
 *
 * This is deliberately a whitelist, not a clone-and-delete pass. Visual state and
 * legacy fields such as URLs, scripts, credentials, tools, and apiKey never enter
 * the request, including when nested in stale node properties.
 */
export function projectExecutableWorkflow(
  nodes: readonly CanvasNode[],
  edges: readonly CanvasEdge[],
  globalVariables?: IntegrationDataFormat['globalVariables'],
): ProjectedWorkflow {
  const projectedNodes = nodes.map(projectNode);
  const nodeById = new Map<string, ProjectedNode>();

  for (const node of projectedNodes) {
    if (nodeById.has(node.id)) throw new WorkflowProjectionError(`Duplicate node id "${node.id}".`);
    nodeById.set(node.id, node);
  }

  const startNodes = projectedNodes.filter((node) => node.data.isStartNode === true);
  if (startNodes.length !== 1) {
    throw new WorkflowProjectionError(`Workflow must contain exactly one manual trigger; found ${startNodes.length}.`);
  }
  if (startNodes[0]?.data.type !== 'trigger') {
    throw new WorkflowProjectionError('Only a trigger node may be the workflow start node.');
  }

  const edgeIds = new Set<string>();
  const projectedEdges = edges.map((edge, index) => {
    const id = requiredString(edge.id, `Edge ${index + 1} id`);
    const source = requiredString(edge.source, `Edge "${id}" source`);
    const target = requiredString(edge.target, `Edge "${id}" target`);
    if (edgeIds.has(id)) throw new WorkflowProjectionError(`Duplicate edge id "${id}".`);
    edgeIds.add(id);
    if (!nodeById.has(source)) throw new WorkflowProjectionError(`Edge "${id}" references missing source "${source}".`);
    if (!nodeById.has(target)) throw new WorkflowProjectionError(`Edge "${id}" references missing target "${target}".`);
    if (nodeById.get(target)?.data.isStartNode) {
      throw new WorkflowProjectionError(`Edge "${id}" cannot target the manual trigger.`);
    }

    const sourceHandle = optionalString(edge.sourceHandle);
    return { id, source, target, ...(sourceHandle ? { sourceHandle } : {}) };
  });

  preflightBranchHandles(projectedNodes, projectedEdges);
  return {
    nodes: projectedNodes,
    edges: projectedEdges,
    ...(globalVariables && Object.keys(globalVariables).length > 0 ? { globalVariables } : {}),
  };
}

function projectNode(node: CanvasNode, index: number): ProjectedNode {
  const id = requiredString(node.id, `Node ${index + 1} id`);
  const rawType = requiredString(node.data?.type, `Node "${id}" type`);
  if (!NODE_TYPES.has(rawType)) {
    throw new WorkflowProjectionError(`Node "${id}" has unsupported executable type "${rawType}".`);
  }
  const type = rawType as ExecutableNodeType;
  const rawProperties = plainRecord(node.data?.properties, `Node "${id}" properties`);
  const errorPolicy = readErrorPolicy(rawProperties['errorPolicy'], id);
  const config = projectConfig(type, rawProperties, id);
  const properties = { ...config, ...(errorPolicy ? { errorPolicy } : {}) };
  const isStartNode = node.data?.isStartNode === true;

  if (type === 'trigger' && !isStartNode) {
    throw new WorkflowProjectionError(`Trigger node "${id}" must be marked as the manual start node.`);
  }
  if (type !== 'trigger' && isStartNode) {
    throw new WorkflowProjectionError(`Non-trigger node "${id}" cannot be marked as a start node.`);
  }

  return { id, data: { type, ...(isStartNode ? { isStartNode: true as const } : {}), properties } };
}

function projectConfig(type: ExecutableNodeType, properties: Record<string, unknown>, nodeId: string) {
  switch (type) {
    case 'trigger':
    case 'multi-port': {
      return {};
    }
    case 'action': {
      return { type: requiredString(properties['type'], `Action "${nodeId}" type`) };
    }
    case 'delay': {
      const duration = plainRecord(properties['duration'], `Delay "${nodeId}" duration`);
      const amount = requiredFiniteNumber(duration['amount'], `Delay "${nodeId}" amount`);
      const unit = requiredString(duration['unit'], `Delay "${nodeId}" unit`);
      if (amount <= 0) throw new WorkflowProjectionError(`Delay "${nodeId}" amount must be greater than zero.`);
      if (!DELAY_UNITS.has(unit)) {
        throw new WorkflowProjectionError(`Delay "${nodeId}" unit must be seconds, minutes, or hours.`);
      }
      if (amount * DELAY_UNIT_MS[unit]! > MAX_DELAY_MS) {
        throw new WorkflowProjectionError(`Delay "${nodeId}" exceeds the 24 hour maximum.`);
      }
      return { duration: { amount, unit } };
    }
    case 'conditional': {
      return {
        conditionsArray: projectConditions(properties['conditionsArray'], `Conditional "${nodeId}"`),
      };
    }
    case 'decision': {
      const rawBranches = requiredArray(properties['decisionBranches'], `Decision "${nodeId}" branches`);
      const decisionBranches: DecisionBranch[] = rawBranches.map((rawBranch, index) => {
        const branch = plainRecord(rawBranch, `Decision "${nodeId}" branch ${index + 1}`);
        const sourceHandle = requiredString(
          branch['sourceHandle'],
          `Decision "${nodeId}" branch ${index + 1} sourceHandle`,
        );
        if (sourceHandle === DEFAULT_DECISION_HANDLE) {
          throw new WorkflowProjectionError(
            `Decision "${nodeId}" uses reserved handle "${DEFAULT_DECISION_HANDLE}" as a custom branch.`,
          );
        }
        return {
          id: requiredString(branch['id'], `Decision "${nodeId}" branch ${index + 1} id`),
          sourceHandle,
          label: requiredString(branch['label'], `Decision "${nodeId}" branch ${index + 1} label`),
          conditions: projectConditions(branch['conditions'], `Decision "${nodeId}" branch ${index + 1}`),
        };
      });
      const uniqueHandles = new Set(decisionBranches.map((branch) => branch.sourceHandle));
      if (uniqueHandles.size !== decisionBranches.length) {
        throw new WorkflowProjectionError(`Decision "${nodeId}" contains duplicate branch handles.`);
      }
      return { decisionBranches };
    }
    case 'notification': {
      const recipient = optionalString(properties['recipient']);
      const message = optionalString(properties['message']);
      return {
        type: requiredString(properties['type'], `Notification "${nodeId}" type`),
        ...(recipient ? { recipient } : {}),
        ...(message ? { message } : {}),
      };
    }
    case 'ai-agent': {
      return { systemPrompt: requiredString(properties['systemPrompt'], `AI agent "${nodeId}" systemPrompt`) };
    }
  }
}

function projectConditions(value: unknown, owner: string): Condition[] {
  return requiredArray(value, `${owner} conditions`).map((rawCondition, index) => {
    const condition = plainRecord(rawCondition, `${owner} condition ${index + 1}`);
    const logicalOperator = optionalString(condition['logicalOperator']);
    return {
      x: requiredString(condition['x'], `${owner} condition ${index + 1} left value`),
      comparisonOperator: requiredString(
        condition['comparisonOperator'],
        `${owner} condition ${index + 1} comparison operator`,
      ),
      y: requiredString(condition['y'], `${owner} condition ${index + 1} right value`),
      ...(logicalOperator ? { logicalOperator } : {}),
    };
  });
}

function preflightBranchHandles(nodes: ProjectedNode[], edges: ProjectedEdge[]) {
  const outgoing = new Map<string, ProjectedEdge[]>();
  for (const edge of edges) outgoing.set(edge.source, [...(outgoing.get(edge.source) ?? []), edge]);

  for (const node of nodes) {
    const nodeEdges = outgoing.get(node.id) ?? [];
    if (node.data.type === 'conditional') {
      preflightRequiredHandles(node.id, nodeEdges, CONDITIONAL_HANDLES, 'conditional');
    }
    if (node.data.type === 'decision') {
      const branches = node.data.properties['decisionBranches'] as DecisionBranch[];
      const handles = new Set([...branches.map((branch) => branch.sourceHandle), DEFAULT_DECISION_HANDLE]);
      preflightRequiredHandles(node.id, nodeEdges, handles, 'decision');
    }
  }
}

function preflightRequiredHandles(
  nodeId: string,
  edges: ProjectedEdge[],
  requiredHandles: ReadonlySet<string>,
  kind: string,
) {
  const connected = new Set<string>();
  for (const edge of edges) {
    if (!edge.sourceHandle) {
      throw new WorkflowProjectionError(
        `${capitalize(kind)} "${nodeId}" edge "${edge.id}" is missing a branch handle.`,
      );
    }
    if (!requiredHandles.has(edge.sourceHandle)) {
      throw new WorkflowProjectionError(
        `${capitalize(kind)} "${nodeId}" edge "${edge.id}" uses unknown branch handle "${edge.sourceHandle}".`,
      );
    }
    connected.add(edge.sourceHandle);
  }
  const missing = [...requiredHandles].filter((handle) => !connected.has(handle));
  if (missing.length > 0) {
    throw new WorkflowProjectionError(
      `${capitalize(kind)} "${nodeId}" has unconnected branch handle(s): ${missing.join(', ')}.`,
    );
  }
}

function readErrorPolicy(value: unknown, nodeId: string): NodeErrorPolicy | undefined {
  if (value === undefined || value === '') return undefined;
  if (typeof value !== 'string' || !ERROR_POLICIES.has(value)) {
    throw new WorkflowProjectionError(`Node "${nodeId}" has an invalid error policy.`);
  }
  return value as NodeErrorPolicy;
}

function requiredString(value: unknown, label: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new WorkflowProjectionError(`${label} must be a non-empty string.`);
  }
  return value.trim();
}

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function requiredFiniteNumber(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new WorkflowProjectionError(`${label} must be a finite number.`);
  }
  return value;
}

function requiredArray(value: unknown, label: string): unknown[] {
  if (!Array.isArray(value)) throw new WorkflowProjectionError(`${label} must be an array.`);
  return value;
}

function plainRecord(value: unknown, label: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new WorkflowProjectionError(`${label} must be an object.`);
  }
  return value as Record<string, unknown>;
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
