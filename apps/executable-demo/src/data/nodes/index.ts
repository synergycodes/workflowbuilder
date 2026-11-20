import {
  type NodeDataProperties,
  type NodeSchema,
  NodeType,
  type PaletteItem,
  type PaletteItemOrGroup,
  type UISchema,
  errorPolicyProperty,
  getScope,
  globalControls,
  sharedProperties,
} from '@workflowbuilder/sdk';

const baseSchemaProperties = {
  ...sharedProperties,
  ...errorPolicyProperty,
} as const;

const commonUi = [
  ...globalControls,
  {
    type: 'Accordion',
    label: 'General Information',
    elements: [
      { type: 'Text', scope: '#/properties/label', label: 'Title', placeholder: 'Node title...' },
      {
        type: 'Text',
        scope: '#/properties/description',
        label: 'Description',
        placeholder: 'Describe this step...',
      },
      { type: 'Select', scope: '#/properties/errorPolicy', label: 'On error' },
    ],
  },
] as UISchema[];

export const triggerSchema = {
  type: 'object',
  required: ['label', 'description'],
  properties: baseSchemaProperties,
} satisfies NodeSchema;
export type TriggerSchema = typeof triggerSchema;

export const actionTypes = [
  { label: 'Simulate task', value: 'task' },
  { label: 'Simulate data update', value: 'dataUpdate' },
  { label: 'Simulate handoff', value: 'handoff' },
] as const;
export const actionSchema = {
  type: 'object',
  required: ['label', 'description', 'type'],
  properties: {
    ...baseSchemaProperties,
    type: { type: 'string', options: [...actionTypes], placeholder: 'Choose a simulated action' },
  },
} satisfies NodeSchema;
export type ActionSchema = typeof actionSchema;

export const delayUnits = [
  { label: 'Seconds', value: 'seconds' },
  { label: 'Minutes', value: 'minutes' },
  { label: 'Hours', value: 'hours' },
] as const;
export const delaySchema = {
  type: 'object',
  required: ['label', 'description', 'duration'],
  properties: {
    ...baseSchemaProperties,
    duration: {
      type: 'object',
      required: ['amount', 'unit'],
      properties: {
        amount: { type: 'number', minimum: 0.001, maximum: 86_400 },
        unit: { type: 'string', options: [...delayUnits] },
      },
    },
  },
} satisfies NodeSchema;
export type DelaySchema = typeof delaySchema;

const conditionFields = {
  x: { type: 'string' },
  comparisonOperator: { type: 'string' },
  y: { type: 'string' },
  logicalOperator: { type: 'string' },
} as const;
export const conditionalSchema = {
  type: 'object',
  required: ['label', 'description', 'conditionsArray'],
  properties: {
    ...baseSchemaProperties,
    conditionsArray: { type: 'array', items: { type: 'object', properties: conditionFields } },
  },
} satisfies NodeSchema;
export type ConditionalSchema = typeof conditionalSchema;

export const decisionSchema = {
  type: 'object',
  required: ['label', 'description', 'decisionBranches'],
  properties: {
    ...baseSchemaProperties,
    decisionBranches: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          sourceHandle: { type: 'string' },
          label: { type: 'string' },
          conditions: { type: 'array', items: { type: 'object', properties: conditionFields } },
        },
      },
    },
  },
} satisfies NodeSchema;
export type DecisionSchema = typeof decisionSchema;

export const notificationTypes = [
  { label: 'Email (simulated)', value: 'email' },
  { label: 'SMS (simulated)', value: 'sms' },
  { label: 'Push (simulated)', value: 'push' },
] as const;
export const notificationSchema = {
  type: 'object',
  required: ['label', 'description', 'type'],
  properties: {
    ...baseSchemaProperties,
    type: { type: 'string', options: [...notificationTypes], placeholder: 'Choose a simulated channel' },
    recipient: { type: 'string' },
    message: { type: 'string' },
  },
} satisfies NodeSchema;
export type NotificationSchema = typeof notificationSchema;

export const aiAgentSchema = {
  type: 'object',
  required: ['label', 'description', 'systemPrompt'],
  properties: {
    ...baseSchemaProperties,
    systemPrompt: { type: 'string', minLength: 1 },
  },
} satisfies NodeSchema;
export type AiAgentSchema = typeof aiAgentSchema;

export const multiPortSchema = {
  type: 'object',
  required: ['label', 'description'],
  properties: baseSchemaProperties,
} satisfies NodeSchema;
export type MultiPortSchema = typeof multiPortSchema;

function standardUi(schema: NodeSchema, extra: UISchema[] = []): UISchema {
  void schema;
  return { type: 'VerticalLayout', elements: [...commonUi, ...extra] };
}

const actionScope = getScope<ActionSchema>;
const delayScope = getScope<DelaySchema>;
const conditionalScope = getScope<ConditionalSchema>;
const decisionScope = getScope<DecisionSchema>;
const notificationScope = getScope<NotificationSchema>;
const aiScope = getScope<AiAgentSchema>;

export const triggerNode: PaletteItem<TriggerSchema> = {
  label: 'Manual trigger',
  description: 'Starts a backend execution with the run payload.',
  type: 'trigger',
  icon: 'Lightning',
  templateType: NodeType.StartNode,
  isStartNode: true,
  defaultPropertiesData: {
    label: 'Manual trigger',
    description: 'Starts when Run is selected.',
    errorPolicy: 'fail',
  } satisfies NodeDataProperties<TriggerSchema>,
  schema: triggerSchema,
  uischema: standardUi(triggerSchema),
  outputSchema: {
    type: 'default',
    properties: {
      eventType: { type: 'string', label: 'Event type', description: 'Always manual for this trigger.' },
      timestamp: { type: 'string', label: 'Timestamp', description: 'Time the execution began.' },
      payload: { type: 'object', label: 'Payload', description: 'The JSON object supplied when the run started.' },
    },
  },
};

export const actionNode: PaletteItem<ActionSchema> = {
  label: 'Action',
  description: 'Reports a simulated action without external side effects.',
  type: 'action',
  icon: 'PlayCircle',
  defaultPropertiesData: {
    label: 'Simulated action',
    description: 'Demonstrates an executable task safely.',
    type: actionTypes[0].value,
    errorPolicy: 'fail',
  } satisfies NodeDataProperties<ActionSchema>,
  schema: actionSchema,
  uischema: standardUi(actionSchema, [
    { type: 'Select', scope: actionScope('properties.type'), label: 'Action type', options: [...actionTypes] },
  ]),
  outputSchema: {
    type: 'default',
    properties: {
      status: { type: 'string', label: 'Status', description: 'Simulation status.' },
      result: { type: 'object', label: 'Result', description: 'Safe simulation details.' },
      errorMessage: { type: 'string', label: 'Error message', description: 'Empty when successful.' },
    },
  },
};

export const delayNode: PaletteItem<DelaySchema> = {
  label: 'Delay',
  description: 'Waits a fixed, bounded duration.',
  type: 'delay',
  icon: 'Timer',
  defaultPropertiesData: {
    label: 'Wait',
    description: 'Pause before the next step.',
    duration: { amount: 1, unit: 'seconds' },
    errorPolicy: 'fail',
  } satisfies NodeDataProperties<DelaySchema>,
  schema: delaySchema,
  uischema: standardUi(delaySchema, [
    {
      type: 'Accordion',
      label: 'Fixed duration (maximum 24 hours)',
      elements: [
        { type: 'Text', scope: delayScope('properties.duration.properties.amount'), label: 'Amount' },
        {
          type: 'Select',
          scope: delayScope('properties.duration.properties.unit'),
          label: 'Unit',
          options: [...delayUnits],
        },
      ],
    },
  ]),
  outputSchema: {
    type: 'default',
    properties: {
      resumedAt: { type: 'string', label: 'Resumed at', description: 'Time the delay ended.' },
      delayDuration: { type: 'number', label: 'Delay duration', description: 'Wait time in milliseconds.' },
    },
  },
};

export const conditionalNode: PaletteItem<ConditionalSchema> = {
  label: 'Conditional',
  description: 'Routes through true or false handles.',
  type: 'conditional',
  icon: 'ListChecks',
  defaultPropertiesData: {
    label: 'Check condition',
    description: 'Evaluate one or more conditions.',
    conditionsArray: [],
    errorPolicy: 'fail',
  } satisfies NodeDataProperties<ConditionalSchema>,
  schema: conditionalSchema,
  uischema: standardUi(conditionalSchema, [
    { type: 'DynamicConditions', scope: conditionalScope('properties.conditionsArray'), label: 'Conditions' },
  ]),
  outputSchema: {
    type: 'default',
    properties: {
      result: { type: 'boolean', label: 'Result', description: 'The evaluated boolean result.' },
      matchedCondition: {
        type: 'string',
        label: 'Matched condition',
        description: 'Condition that determined the route.',
      },
    },
  },
};

export const decisionNode: PaletteItem<DecisionSchema> = {
  label: 'Decision',
  description: 'Routes to the first match or its permanent default port.',
  type: 'decision',
  icon: 'ArrowsSplit',
  templateType: NodeType.DecisionNode,
  defaultPropertiesData: {
    label: 'Choose branch',
    description: 'First matching branch wins; otherwise Default is used.',
    decisionBranches: [],
    errorPolicy: 'fail',
  } satisfies NodeDataProperties<DecisionSchema>,
  schema: decisionSchema,
  uischema: standardUi(decisionSchema, [
    { type: 'DecisionBranches', scope: decisionScope('properties.decisionBranches') },
  ]),
  outputSchema: {
    type: 'default',
    properties: {
      selectedBranch: { type: 'string', label: 'Selected branch', description: 'Handle selected by the decision.' },
      branchIndex: {
        type: 'number',
        label: 'Branch index',
        description: 'The default branch uses the index after all configured matching branches.',
      },
    },
  },
};

export const notificationNode: PaletteItem<NotificationSchema> = {
  label: 'Notification',
  description: 'Reports a simulated notification without contacting anyone.',
  type: 'notification',
  icon: 'PaperPlaneRight',
  defaultPropertiesData: {
    label: 'Simulated notification',
    description: 'Records what would be sent; sends nothing.',
    type: notificationTypes[0].value,
    recipient: '',
    message: '',
    errorPolicy: 'fail',
  } satisfies NodeDataProperties<NotificationSchema>,
  schema: notificationSchema,
  uischema: standardUi(notificationSchema, [
    {
      type: 'Accordion',
      label: 'Simulation',
      elements: [
        {
          type: 'Select',
          scope: notificationScope('properties.type'),
          label: 'Channel',
          options: [...notificationTypes],
        },
        { type: 'Text', scope: notificationScope('properties.recipient'), label: 'Recipient label (optional)' },
        {
          type: 'VariableTextArea',
          scope: notificationScope('properties.message'),
          label: 'Message (optional)',
          minRows: 4,
        },
      ],
    },
  ]),
  outputSchema: {
    type: 'default',
    properties: {
      sent: { type: 'boolean', label: 'Sent', description: 'Always false in this safe demo.' },
      sentAt: { type: 'string', label: 'Simulated at', description: 'Time the step ran.' },
      recipient: { type: 'string', label: 'Recipient', description: 'Configured recipient label.' },
      channel: { type: 'string', label: 'Channel', description: 'Configured simulated channel.' },
    },
  },
};

export const aiAgentNode: PaletteItem<AiAgentSchema> = {
  label: 'AI agent',
  description: 'Runs the backend-configured model with only a system prompt.',
  type: 'ai-agent',
  icon: 'AiAgent',
  templateType: NodeType.AiNode,
  defaultPropertiesData: {
    label: 'AI agent',
    description: 'Transform upstream context with a system prompt.',
    systemPrompt: 'Summarize the available workflow context in one concise sentence.',
    errorPolicy: 'fail',
  } satisfies NodeDataProperties<AiAgentSchema>,
  schema: aiAgentSchema,
  uischema: standardUi(aiAgentSchema, [
    {
      type: 'Accordion',
      label: 'System prompt',
      elements: [
        {
          type: 'VariableTextArea',
          scope: aiScope('properties.systemPrompt'),
          placeholder: 'Describe what the model should do. Use {{ to insert variables.',
          minRows: 6,
        },
      ],
    },
  ]),
  outputSchema: {
    type: 'default',
    properties: {
      response: { type: 'string', label: 'Response', description: 'Text produced by the backend model.' },
      tokensUsed: { type: 'number', label: 'Tokens used', description: 'Reported token usage.' },
      model: { type: 'string', label: 'Model', description: 'Backend-selected model.' },
    },
  },
};

export const multiPortNode: PaletteItem<MultiPortSchema> = {
  label: 'Multi-port',
  description: 'Copies its input to four ordinary output ports.',
  type: 'multi-port',
  icon: 'ArrowsOutCardinal',
  defaultPropertiesData: {
    label: 'Multi-port',
    description: 'Fan out through any of four ports.',
    errorPolicy: 'fail',
  } satisfies NodeDataProperties<MultiPortSchema>,
  schema: multiPortSchema,
  uischema: standardUi(multiPortSchema),
  outputSchema: {
    type: 'default',
    properties: {
      routed: { type: 'boolean', label: 'Routed', description: 'True after the copy step completes.' },
    },
  },
};

export const executableNodeTypes: PaletteItemOrGroup[] = [
  triggerNode,
  actionNode,
  delayNode,
  conditionalNode,
  decisionNode,
  notificationNode,
  aiAgentNode,
  multiPortNode,
];
