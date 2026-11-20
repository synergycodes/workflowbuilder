import type { BaseNode } from './execution-model';

export const DEMO_WORKFLOW_TASK_QUEUE = 'demo-workflow-execution' as const;

export const DEMO_NODE_TYPES = [
  'trigger',
  'action',
  'delay',
  'conditional',
  'decision',
  'notification',
  'ai-agent',
  'multi-port',
] as const;

export type DemoNodeType = (typeof DEMO_NODE_TYPES)[number];

export const DEMO_CONDITION_OPERATORS = [
  'isEqual',
  'isNotEqual',
  'isContaining',
  'isNotContaining',
  'isBefore',
  'isAfter',
  'isGreaterThan',
  'isLessThan',
  'isGreaterThanOrEqual',
  'isLessThanOrEqual',
] as const;

export type DemoConditionOperator = (typeof DEMO_CONDITION_OPERATORS)[number];
export type DemoConditionLogicalOperator = 'AND' | 'OR';

export type DemoCondition = {
  x: string;
  y: string;
  comparisonOperator: DemoConditionOperator;
  logicalOperator?: DemoConditionLogicalOperator;
};

export type DemoTriggerNode = BaseNode & {
  type: 'trigger';
  config: Record<string, never>;
};

export type DemoActionNode = BaseNode & {
  type: 'action';
  config: {
    type: string;
  };
};

export const DEMO_DELAY_UNITS = ['seconds', 'minutes', 'hours'] as const;
export type DemoDelayUnit = (typeof DEMO_DELAY_UNITS)[number];

export type DemoDelayNode = BaseNode & {
  type: 'delay';
  config: {
    duration: {
      amount: number;
      unit: DemoDelayUnit;
    };
  };
};

export type DemoConditionalNode = BaseNode & {
  type: 'conditional';
  config: {
    conditionsArray: DemoCondition[];
  };
};

export type DemoDecisionBranch = {
  id: string;
  sourceHandle: string;
  label: string;
  conditions: DemoCondition[];
};

export type DemoDecisionNode = BaseNode & {
  type: 'decision';
  config: {
    decisionBranches: DemoDecisionBranch[];
  };
};

export type DemoNotificationNode = BaseNode & {
  type: 'notification';
  config: {
    type: string;
    recipient?: string;
    message?: string;
  };
};

export type DemoAiAgentNode = BaseNode & {
  type: 'ai-agent';
  config: {
    systemPrompt: string;
  };
};

export type DemoMultiPortNode = BaseNode & {
  type: 'multi-port';
  config: Record<string, never>;
};

export type DemoExecutionNode =
  | DemoTriggerNode
  | DemoActionNode
  | DemoDelayNode
  | DemoConditionalNode
  | DemoDecisionNode
  | DemoNotificationNode
  | DemoAiAgentNode
  | DemoMultiPortNode;

export type DemoTriggerOutput = {
  eventType: 'manual';
  timestamp: string;
  payload: Record<string, unknown>;
};

export type DemoActionOutput = {
  status: 'success';
  result: {
    simulated: true;
    performed: false;
    actionType: string;
  };
  errorMessage: '';
};

export type DemoDelayOutput = {
  resumedAt: string;
  delayDuration: number;
};

export type DemoConditionalOutput = {
  result: boolean;
  matchedCondition: string;
};

export type DemoDecisionOutput = {
  selectedBranch: string;
  branchIndex: number;
};

export type DemoNotificationOutput = {
  sent: false;
  sentAt: string;
  recipient: string;
  channel: string;
};

export type DemoAiAgentOutput = {
  response: string;
  tokensUsed: number;
  model: string;
};

export type DemoMultiPortOutput = {
  routed: true;
};

export type DemoNodeOutput =
  | DemoTriggerOutput
  | DemoActionOutput
  | DemoDelayOutput
  | DemoConditionalOutput
  | DemoDecisionOutput
  | DemoNotificationOutput
  | DemoAiAgentOutput
  | DemoMultiPortOutput;
