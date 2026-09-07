import { z } from 'zod';

import { DECLARABLE_DECISION_EFFECTS } from '@workflow-builder/types/workflow-execution/decision-contract';

// Mirrors DURATION_PATTERN and the protobuf Duration range in
// packages/temporal/src/workflow/profile-validation.ts (follow-up: shared-duration-format)
const DURATION_PATTERN = /^(\d+(?:\.\d+)?)(ms|s|m|h|d)$/;
const UNIT_MS = { ms: 1, s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 } as const;
const MIN_DURATION_MS = 0.000_001;
const MAX_DURATION_MS = 315_576_000_000 * UNIT_MS.s;

function isDurationString(value: string): boolean {
  const match = DURATION_PATTERN.exec(value);
  if (match === null) return false;
  const milliseconds = Number.parseFloat(match[1]) * UNIT_MS[match[2] as keyof typeof UNIT_MS];
  return milliseconds >= MIN_DURATION_MS && milliseconds <= MAX_DURATION_MS;
}

const durationSchema = z
  .string()
  .refine(
    isDurationString,
    "must be a positive duration such as '30s', '24h' or '3d' (a number followed by ms, s, m, h or d)",
  );

// 'errorRoute' is the handle the runner reserves for the error policy.
const portSchema = z
  .string()
  .min(1, 'port must not be empty')
  .refine((port) => port !== 'errorRoute', "port must not be the reserved 'errorRoute'");

const actionBase = {
  name: z.string().min(1, 'name must not be empty'),
  label: z.string().min(1, 'label must not be empty'),
};

const resumeActionSchema = z.looseObject({
  ...actionBase,
  effect: z.literal('resume'),
  port: portSchema.default('approved'),
});

const rejectActionSchema = z.looseObject({
  ...actionBase,
  effect: z.literal('reject'),
  port: portSchema.default('rejected'),
  reasonRequired: z.boolean().default(false),
});

const rerunSourceActionSchema = z.looseObject({
  ...actionBase,
  effect: z.literal('rerun-source'),
  maxIterations: z.int().min(1).default(3),
});

const decisionActionSchema = z.discriminatedUnion(
  'effect',
  [resumeActionSchema, rejectActionSchema, rerunSourceActionSchema],
  {
    error: (issue) =>
      issue.code === 'invalid_union' ? `effect must be one of ${DECLARABLE_DECISION_EFFECTS.join(', ')}` : undefined,
  },
);

const formPropertySchema = z.looseObject({
  type: z.string(),
  readOnly: z.boolean().optional(),
  'x-pii': z.boolean().optional(),
});

// Shape only. Validating values against the schema needs a JSON Schema validator the
// backend does not have yet (follow-up: decision-edit-value-validation)
const formSchema = z
  .looseObject({
    type: z.literal('object'),
    properties: z.record(z.string(), formPropertySchema),
    required: z.array(z.string()).optional(),
  })
  .superRefine((form, context) => {
    for (const [index, name] of (form.required ?? []).entries()) {
      if (!Object.hasOwn(form.properties, name)) {
        context.addIssue({
          code: 'custom',
          message: `required field '${name}' is not declared in properties`,
          path: ['required', index],
        });
      }
    }
  });

const deadlineSchema = z.looseObject({
  after: durationSchema,
  policy: z.string().refine((policy) => policy === 'reject', "policy must be 'reject'"),
});

export const decisionContractSchema = z
  .looseObject({
    version: z.literal(1),
    actions: z.array(decisionActionSchema).min(1, 'at least one action is required'),
    schema: formSchema,
    uiSchema: z.record(z.string(), z.unknown()).optional(),
    proposalSourceNodeId: z.string().optional(),
    deadline: deadlineSchema.optional(),
  })
  .superRefine((contract, context) => {
    const seenNames = new Set<string>();
    const firstIndexByEffect = new Map<string, number>();

    for (const [index, action] of contract.actions.entries()) {
      if (seenNames.has(action.name)) {
        context.addIssue({
          code: 'custom',
          message: `action name '${action.name}' is used more than once`,
          path: ['actions', index, 'name'],
        });
      }
      seenNames.add(action.name);

      if (firstIndexByEffect.has(action.effect)) {
        context.addIssue({
          code: 'custom',
          message: `only one action may have effect '${action.effect}'`,
          path: ['actions', index, 'effect'],
        });
      } else {
        firstIndexByEffect.set(action.effect, index);
      }
    }

    const resumeIndex = firstIndexByEffect.get('resume');
    if (resumeIndex === undefined) {
      context.addIssue({ code: 'custom', message: "an action with effect 'resume' is required", path: ['actions'] });
      return;
    }

    const rejectIndex = firstIndexByEffect.get('reject');
    if (rejectIndex === undefined) return;
    const resume = contract.actions[resumeIndex];
    const reject = contract.actions[rejectIndex];
    if (resume.effect === 'resume' && reject.effect === 'reject' && resume.port === reject.port) {
      context.addIssue({
        code: 'custom',
        message: `reject port '${reject.port}' must differ from the resume port`,
        path: ['actions', rejectIndex, 'port'],
      });
    }
  });
