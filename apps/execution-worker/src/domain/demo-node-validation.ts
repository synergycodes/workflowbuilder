import {
  DEMO_CONDITION_OPERATORS,
  DEMO_DELAY_UNITS,
  DEMO_NODE_TYPES,
  type DemoCondition,
  type DemoDecisionBranch,
  type DemoExecutionNode,
} from '@workflow-builder/types/workflow-execution/demo-execution';

export class DemoNodeValidationError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'DemoNodeValidationError';
  }
}

export function validateDemoNode(value: unknown): DemoExecutionNode {
  const node = requireRecord(value, 'node');
  const id = requireNonEmptyString(node['id'], 'node.id');
  const type = requireNonEmptyString(node['type'], 'node.type');

  if (!(DEMO_NODE_TYPES as readonly string[]).includes(type)) {
    throw validationError('unsupported_demo_node_type', `Unsupported executable demo node type: ${type}`);
  }

  const config = requireRecord(node['config'], `node ${id}.config`);

  switch (type) {
    case 'trigger':
    case 'multi-port': {
      return { ...node, id, type, config: {} } as DemoExecutionNode;
    }
    case 'action': {
      return {
        ...node,
        id,
        type,
        config: { type: requireNonEmptyString(config['type'], `node ${id}.config.type`) },
      } as DemoExecutionNode;
    }
    case 'delay': {
      const duration = requireRecord(config['duration'], `node ${id}.config.duration`);
      const amount = requireFiniteNumber(duration['amount'], `node ${id}.config.duration.amount`);
      const unit = requireNonEmptyString(duration['unit'], `node ${id}.config.duration.unit`);
      if (!(DEMO_DELAY_UNITS as readonly string[]).includes(unit)) {
        throw validationError(
          'invalid_demo_delay_unit',
          `node ${id}.config.duration.unit must be seconds, minutes, or hours`,
        );
      }
      if (amount <= 0) {
        throw validationError('invalid_demo_delay', `node ${id}.config.duration.amount must be greater than 0`);
      }
      if (durationMilliseconds(amount, unit) > 24 * 60 * 60 * 1000) {
        throw validationError('demo_delay_too_long', `node ${id} delay must not exceed 24 hours`);
      }
      return { ...node, id, type, config: { duration: { amount, unit } } } as DemoExecutionNode;
    }
    case 'conditional': {
      return {
        ...node,
        id,
        type,
        config: { conditionsArray: validateConditions(config['conditionsArray'], `node ${id}.config.conditionsArray`) },
      } as DemoExecutionNode;
    }
    case 'decision': {
      const branches = requireArray(config['decisionBranches'], `node ${id}.config.decisionBranches`).map(
        (branch, index) => validateBranch(branch, `node ${id}.config.decisionBranches[${index}]`),
      );
      return { ...node, id, type, config: { decisionBranches: branches } } as DemoExecutionNode;
    }
    case 'notification': {
      return {
        ...node,
        id,
        type,
        config: {
          type: requireNonEmptyString(config['type'], `node ${id}.config.type`),
          ...optionalStringProperty(config, 'recipient', `node ${id}.config.recipient`),
          ...optionalStringProperty(config, 'message', `node ${id}.config.message`),
        },
      } as DemoExecutionNode;
    }
    case 'ai-agent': {
      return {
        ...node,
        id,
        type,
        config: { systemPrompt: requireString(config['systemPrompt'], `node ${id}.config.systemPrompt`) },
      } as DemoExecutionNode;
    }
    default: {
      throw validationError('unsupported_demo_node_type', `Unsupported executable demo node type: ${type}`);
    }
  }
}

function validateBranch(value: unknown, path: string): DemoDecisionBranch {
  const branch = requireRecord(value, path);
  const conditions = validateConditions(branch['conditions'], `${path}.conditions`);
  if (conditions.length === 0) {
    throw validationError('invalid_demo_decision_branch', `${path}.conditions must contain at least one condition`);
  }
  const sourceHandle = requireNonEmptyString(branch['sourceHandle'], `${path}.sourceHandle`);
  if (sourceHandle === 'default' || sourceHandle === 'errorRoute') {
    throw validationError(
      'reserved_demo_decision_handle',
      `${path}.sourceHandle must not use reserved handle "${sourceHandle}"`,
    );
  }
  return {
    id: requireNonEmptyString(branch['id'], `${path}.id`),
    sourceHandle,
    label: requireNonEmptyString(branch['label'], `${path}.label`),
    conditions,
  };
}

function validateConditions(value: unknown, path: string): DemoCondition[] {
  return requireArray(value, path).map((conditionValue, index) => {
    const conditionPath = `${path}[${index}]`;
    const condition = requireRecord(conditionValue, conditionPath);
    const comparisonOperator = requireNonEmptyString(
      condition['comparisonOperator'],
      `${conditionPath}.comparisonOperator`,
    );
    if (!(DEMO_CONDITION_OPERATORS as readonly string[]).includes(comparisonOperator)) {
      throw validationError(
        'unsupported_demo_condition_operator',
        `${conditionPath}.comparisonOperator is unsupported: ${comparisonOperator}`,
      );
    }
    const logicalOperator = condition['logicalOperator'];
    if (logicalOperator !== undefined && logicalOperator !== 'AND' && logicalOperator !== 'OR') {
      throw validationError('invalid_demo_logical_operator', `${conditionPath}.logicalOperator must be AND or OR`);
    }
    return {
      x: requireString(condition['x'], `${conditionPath}.x`),
      y: requireString(condition['y'], `${conditionPath}.y`),
      comparisonOperator: comparisonOperator as DemoCondition['comparisonOperator'],
      ...(logicalOperator === undefined ? {} : { logicalOperator }),
    };
  });
}

function durationMilliseconds(amount: number, unit: string): number {
  const multiplier = unit === 'hours' ? 3_600_000 : unit === 'minutes' ? 60_000 : 1000;
  return amount * multiplier;
}

function optionalStringProperty(record: Record<string, unknown>, key: string, path: string): Record<string, string> {
  const value = record[key];
  return value === undefined ? {} : { [key]: requireString(value, path) };
}

function requireRecord(value: unknown, path: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw validationError('invalid_demo_node_config', `${path} must be an object`);
  }
  return value as Record<string, unknown>;
}

function requireArray(value: unknown, path: string): unknown[] {
  if (!Array.isArray(value)) {
    throw validationError('invalid_demo_node_config', `${path} must be an array`);
  }
  return value;
}

function requireString(value: unknown, path: string): string {
  if (typeof value !== 'string') {
    throw validationError('invalid_demo_node_config', `${path} must be a string`);
  }
  return value;
}

function requireNonEmptyString(value: unknown, path: string): string {
  const stringValue = requireString(value, path);
  if (stringValue.trim().length === 0) {
    throw validationError('invalid_demo_node_config', `${path} must not be empty`);
  }
  return stringValue;
}

function requireFiniteNumber(value: unknown, path: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw validationError('invalid_demo_node_config', `${path} must be a finite number`);
  }
  return value;
}

function validationError(code: string, message: string): DemoNodeValidationError {
  return new DemoNodeValidationError(code, message);
}
