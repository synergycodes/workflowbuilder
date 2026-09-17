import { z } from 'zod';

import { DECLARABLE_DECISION_EFFECTS } from '@workflow-builder/types/workflow-execution/decision-request';

import { rejectingOwnProtoKey } from '../schema/own-proto-key';
import { decisionIssue, decisionRefinement } from './decision-issues';

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

const durationSchema = z.string().refine(isDurationString, decisionRefinement('deadline_format'));

function isNotBlank(text: string): boolean {
  return text.trim().length > 0;
}

// A port is the id of a handle on one canvas, so it has no default. 'errorRoute' is the
// handle the runner reserves for the error policy.
const portSchema = z
  .string()
  .refine(isNotBlank, decisionRefinement('port_empty'))
  .refine((port) => port !== 'errorRoute', decisionRefinement('port_reserved'));

const actionBase = {
  name: z.string().refine(isNotBlank, decisionRefinement('name_empty')),
  label: z.string().refine(isNotBlank, decisionRefinement('label_empty')),
};

const resumeActionSchema = z.looseObject({
  ...actionBase,
  effect: z.literal('resume'),
  port: portSchema,
});

const rejectActionSchema = z.looseObject({
  ...actionBase,
  effect: z.literal('reject'),
  port: portSchema,
  reasonRequired: z.boolean().default(false),
});

const rerunSourceActionSchema = z
  .looseObject({
    ...actionBase,
    effect: z.literal('rerun-source'),
    maxIterations: z.int().min(1).default(3),
  })
  .superRefine((action, context) => {
    if (Object.hasOwn(action, 'port')) context.addIssue(decisionIssue('port_not_allowed', ['port']));
  });

// The effect picks the member that parses the rest, so it is checked on its own first: a
// union that finds no member cannot name what was wrong, and a client needs the name.
const declaredEffect = z.unknown().superRefine((action, context) => {
  if (typeof action !== 'object' || action === null || Array.isArray(action)) return;
  const effect = (action as { effect?: unknown }).effect;
  if (typeof effect === 'string' && (DECLARABLE_DECISION_EFFECTS as readonly string[]).includes(effect)) return;
  // Aborting, as the union's own failure was: the request-level rules must not go on to
  // report a missing resume action for an action that never parsed.
  context.addIssue({
    ...decisionIssue('unknown_effect', ['effect'], DECLARABLE_DECISION_EFFECTS.join(', ')),
    continue: false,
  });
});

const decisionActionSchema = declaredEffect.pipe(
  z.discriminatedUnion('effect', [resumeActionSchema, rejectActionSchema, rerunSourceActionSchema]),
);

const formPropertySchema = z.looseObject({
  type: z.union([z.string(), z.array(z.string())]).optional(),
  readOnly: z.boolean().optional(),
  'x-pii': z.boolean().optional(),
});

// Shape only.
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
  policy: z.string().refine((policy) => policy === 'reject', decisionRefinement('deadline_policy')),
});

// Guarded on its own, not only through `workflowSnapshotSchema`: every level below is a
// loose object, so a caller parsing raw JSON with this export would inherit a request no
// schema checked. `../schema/own-proto-key.ts` says why a loose object needs that.
export const decisionRequestSchema = rejectingOwnProtoKey(
  z
    .looseObject({
      version: z.literal(1),
      actions: z
        .array(decisionActionSchema)
        .refine((actions) => actions.length > 0, decisionRefinement('actions_empty')),
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
        context.addIssue(
          decisionIssue('reject_port_equals_resume_port', ['actions', rejectIndex, 'port'], reject.port),
        );
      }
    }),
);
