// Concrete node vocabulary for the AI Studio product. Owned by the worker,
// not by execution-core or @workflow-builder/types — those layers only know
// the generic BaseNode shape. A different product would define its own union
// here and register matching executors.

type TriggerNodeConfig = Record<string, never>;

type AiAgentNodeConfig = {
  systemPrompt: string; // supports {{namespace.path}} template references
};

export type DecisionBranchCondition = {
  x: string;
  y: string;
  comparisonOperator: string;
  logicalOperator?: 'AND' | 'OR';
};

type DecisionBranch = {
  id?: string;
  sourceHandle: string;
  label?: string;
  conditions: DecisionBranchCondition[];
};

type DecisionNodeConfig = {
  decisionBranches: DecisionBranch[];
};

// Display-only node: it renders an upstream output on the canvas. Has no
// runtime config - the UI reads the upstream node's output directly.
type VisualizeNodeConfig = Record<string, never>;

export type TriggerNode = {
  id: string;
  type: 'ai-studio/trigger';
  config: TriggerNodeConfig;
};

export type AiAgentNode = {
  id: string;
  type: 'ai-studio/ai-agent';
  config: AiAgentNodeConfig;
};

export type DecisionNode = {
  id: string;
  type: 'ai-studio/decision';
  config: DecisionNodeConfig;
};

export type VisualizeNode = {
  id: string;
  type: 'ai-studio/visualize';
  config: VisualizeNodeConfig;
};

export type AiStudioNode = TriggerNode | AiAgentNode | DecisionNode | VisualizeNode;
