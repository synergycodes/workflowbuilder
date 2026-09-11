import { PermanentNodeExecutionError } from '@workflowbuilder/temporal';

const EXPRESSION = /^\s*([A-Za-z_][\w.]*)\s*(>=|<=|!=|==|>|<)\s*(.+?)\s*$/;

// Deliberately tiny: one field of the trigger payload, one operator, one literal. A condition
// this parser rejects is a permanent error, which Temporal does not retry: no later attempt
// would read the text differently.
export function evaluateCondition(expression: string, payload: Record<string, unknown>): boolean {
  const match = EXPRESSION.exec(expression);
  if (!match) {
    throw new PermanentNodeExecutionError(
      'condition_invalid',
      `Cannot read condition "${expression}". Expected "<field> <operator> <value>", for example "amount > 100".`,
    );
  }

  const left = payload[match[1]];
  const operator = match[2];
  const right = literal(match[3]);

  switch (operator) {
    case '>': {
      return Number(left) > Number(right);
    }
    case '>=': {
      return Number(left) >= Number(right);
    }
    case '<': {
      return Number(left) < Number(right);
    }
    case '<=': {
      return Number(left) <= Number(right);
    }
    case '==': {
      return String(left) === String(right);
    }
    case '!=': {
      return String(left) !== String(right);
    }
    default: {
      throw new PermanentNodeExecutionError('condition_invalid', `Unsupported operator "${operator}".`);
    }
  }
}

function literal(raw: string): string | number {
  const unquoted = raw.replace(/^(['"])(.*)\1$/, '$2');
  const asNumber = Number(unquoted);
  return unquoted !== '' && !Number.isNaN(asNumber) ? asNumber : unquoted;
}
