import type { ZodIssue, ZodTypeAny, z } from 'zod';

function describeIssue(issue: ZodIssue) {
  if (issue.code === 'unrecognized_keys') {
    return `Unknown parameter${issue.keys.length > 1 ? 's' : ''}: ${issue.keys.join(', ')}`;
  }
  const field = issue.path.join('.');
  return field && issue.message.startsWith('Expected ') ? `Parameter "${field}": ${issue.message}` : issue.message;
}

export function parseInput<Schema extends ZodTypeAny>(schema: Schema, input: unknown): z.output<Schema> {
  const result = schema.safeParse(input);
  if (!result.success) throw new Error(result.error.issues.map((issue) => describeIssue(issue)).join('; '));
  return result.data;
}
