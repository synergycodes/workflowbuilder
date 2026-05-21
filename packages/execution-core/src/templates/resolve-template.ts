// Resolves {{namespace.path}} references (e.g. {{nodes.writer-1.response}}) against the execution context.
import type { ExecutionContext } from '../execution-context';

const TEMPLATE_REGEX = /\{\{(\w+)\.(.+?)\}\}/g;

export function resolveTemplate(template: string, context: ExecutionContext): string {
  return template.replaceAll(TEMPLATE_REGEX, (match, namespace: string, path: string) => {
    let source: unknown;

    switch (namespace) {
      case 'nodes': {
        source = context.nodeOutputs;
        break;
      }
      case 'trigger': {
        source = context.triggerPayload;
        break;
      }
      case 'variables': {
        source = context.variables;
        break;
      }
      case 'global': {
        source = context.global;
        break;
      }
      default: {
        throw new Error(`Unresolved template reference: ${match} (unknown namespace "${namespace}")`);
      }
    }

    const value = getNestedValue(source, path);

    if (value === undefined) {
      throw new Error(`Unresolved template reference: ${match}`);
    }

    return typeof value === 'string' ? value : JSON.stringify(value);
  });
}

function getNestedValue(object: unknown, path: string): unknown {
  const keys = path.split('.');
  let current: unknown = object;

  for (const key of keys) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return undefined;
    }
    current = (current as Record<string, unknown>)[key];
  }

  return current;
}
