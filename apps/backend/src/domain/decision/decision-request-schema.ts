import { z } from 'zod';

import { DECLARABLE_DECISION_EFFECTS } from '@workflow-builder/types/workflow-execution/decision-request';

import { decisionIssue, decisionIssueMessage } from './decision-issues';

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

const durationSchema = z.string().refine(isDurationString, decisionIssueMessage('deadline_format'));

// 'errorRoute' is the handle the runner reserves for the error policy.
const portSchema = z
  .string()
  .min(1, decisionIssueMessage('port_empty'))
  .refine((port) => port !== 'errorRoute', decisionIssueMessage('port_reserved'));

const actionBase = {
  name: z.string().min(1, decisionIssueMessage('name_empty')),
  label: z.string().min(1, decisionIssueMessage('label_empty')),
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
      issue.code === 'invalid_union'
        ? decisionIssueMessage('unknown_effect', DECLARABLE_DECISION_EFFECTS.join(', '))
        : undefined,
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
        context.addIssue(decisionIssue('required_field_undeclared', ['required', index], name));
      }
    }
  });

const deadlineSchema = z.looseObject({
  after: durationSchema,
  policy: z.string().refine((policy) => policy === 'reject', decisionIssueMessage('deadline_policy')),
});

export const decisionRequestSchema = z
  .looseObject({
    version: z.literal(1),
    actions: z.array(decisionActionSchema).min(1, decisionIssueMessage('actions_empty')),
    schema: formSchema,
    uiSchema: z.record(z.string(), z.unknown()).optional(),
    proposalSourceNodeId: z.string().optional(),
    deadline: deadlineSchema.optional(),
  })
  .superRefine((request, context) => {
    const seenNames = new Set<string>();
    const firstIndexByEffect = new Map<string, number>();

    for (const [index, action] of request.actions.entries()) {
      if (seenNames.has(action.name)) {
        context.addIssue(decisionIssue('duplicate_action_name', ['actions', index, 'name'], action.name));
      }
      seenNames.add(action.name);

      if (firstIndexByEffect.has(action.effect)) {
        context.addIssue(decisionIssue('duplicate_effect', ['actions', index, 'effect'], action.effect));
      } else {
        firstIndexByEffect.set(action.effect, index);
      }
    }

    const resumeIndex = firstIndexByEffect.get('resume');
    if (resumeIndex === undefined) {
      context.addIssue(decisionIssue('resume_required', ['actions']));
      return;
    }

    const rejectIndex = firstIndexByEffect.get('reject');
    if (rejectIndex === undefined) return;
    const resume = request.actions[resumeIndex];
    const reject = request.actions[rejectIndex];
    if (resume.effect === 'resume' && reject.effect === 'reject' && resume.port === reject.port) {
      context.addIssue(decisionIssue('reject_port_equals_resume_port', ['actions', rejectIndex, 'port'], reject.port));
    }
  });
