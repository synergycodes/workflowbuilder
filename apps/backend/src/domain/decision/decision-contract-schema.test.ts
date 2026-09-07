import { describe, expect, expectTypeOf, it } from 'vitest';
import type { z } from 'zod';

import {
  DECLARABLE_DECISION_EFFECTS,
  type DecisionContract,
} from '@workflow-builder/types/workflow-execution/decision-contract';

import { decisionContractSchema } from './decision-contract-schema';

const approve = { name: 'approve', label: 'Approve', effect: 'resume', port: 'approved' };
const reject = { name: 'reject', label: 'Reject', effect: 'reject', port: 'rejected', reasonRequired: false };
const reRequest = { name: 're-request', label: 'Ask again', effect: 'rerun-source', maxIterations: 3 };

const refundForm = {
  type: 'object',
  properties: {
    orderDate: { type: 'string', title: 'Order date', readOnly: true },
    customerEmail: { type: 'string', title: 'Customer e-mail', readOnly: true, 'x-pii': true },
    refundAmount: { type: 'number', title: 'Refund amount' },
    emailDraft: { type: 'string', title: 'E-mail draft' },
  },
  required: ['refundAmount'],
};

// The refund story from the design workshop.
function workedExample() {
  return {
    version: 1,
    actions: [approve, reject, reRequest],
    schema: refundForm,
    uiSchema: { type: 'VerticalLayout', elements: [] },
    proposalSourceNodeId: 'source-1',
    deadline: { after: '3d', policy: 'reject' },
  };
}

function contract(overrides: Record<string, unknown> = {}): unknown {
  return { ...workedExample(), ...overrides };
}

function issuePaths(input: unknown): string[] {
  const result = decisionContractSchema.safeParse(input);
  return result.success ? [] : result.error.issues.map((issue) => issue.path.join('.'));
}

describe('decisionContractSchema', () => {
  it('accepts the refund worked example', () => {
    expect(decisionContractSchema.safeParse(workedExample()).success).toBe(true);
  });

  it('accepts a minimal gate: one resume action and an empty form', () => {
    const minimal = {
      version: 1,
      actions: [{ name: 'ok', label: 'OK', effect: 'resume' }],
      schema: { type: 'object', properties: {} },
    };

    expect(decisionContractSchema.safeParse(minimal).success).toBe(true);
  });

  it.each([...DECLARABLE_DECISION_EFFECTS])('accepts a declared %s action', (effect) => {
    const resume = { name: 'ok', label: 'OK', effect: 'resume' };
    const actions = effect === 'resume' ? [resume] : [resume, { name: 'other', label: 'Other', effect }];

    expect(decisionContractSchema.safeParse(contract({ actions })).success).toBe(true);
  });

  it('materialises the defaults for port, reasonRequired and maxIterations', () => {
    const parsed = decisionContractSchema.parse(
      contract({
        actions: [
          { name: 'approve', label: 'Approve', effect: 'resume' },
          { name: 'reject', label: 'Reject', effect: 'reject' },
          { name: 're-request', label: 'Ask again', effect: 'rerun-source' },
        ],
      }),
    );

    expect(parsed.actions).toEqual([
      { name: 'approve', label: 'Approve', effect: 'resume', port: 'approved' },
      { name: 'reject', label: 'Reject', effect: 'reject', port: 'rejected', reasonRequired: false },
      { name: 're-request', label: 'Ask again', effect: 'rerun-source', maxIterations: 3 },
    ]);
  });

  it('keeps unknown keys at every level', () => {
    const input = {
      ...workedExample(),
      audience: 'finance',
      actions: [{ ...approve, icon: 'check' }],
      schema: {
        ...refundForm,
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        properties: {
          ...refundForm.properties,
          customerEmail: { ...refundForm.properties.customerEmail, 'x-mask': 'email' },
        },
      },
      uiSchema: { type: 'VerticalLayout', elements: [{ type: 'Control', scope: '#/properties/refundAmount' }] },
      deadline: { after: '3d', policy: 'reject', warnAfter: '2d' },
    };

    const parsed = decisionContractSchema.parse(input);

    expect(parsed).toMatchObject({
      audience: 'finance',
      actions: [{ icon: 'check' }],
      schema: {
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        properties: { customerEmail: { title: 'Customer e-mail', 'x-mask': 'email' } },
      },
      uiSchema: input.uiSchema,
      deadline: { warnAfter: '2d' },
    });
  });

  it('accepts an explicit readOnly: false', () => {
    const schema = { type: 'object', properties: { amount: { type: 'number', readOnly: false } } };

    const parsed = decisionContractSchema.parse(contract({ schema }));

    expect(parsed.schema.properties['amount']).toEqual({ type: 'number', readOnly: false });
  });

  it.each(['100ms', '30s', '10m', '1.5h', '24h', '3d', '7d'])('accepts a deadline of %s', (after) => {
    expect(decisionContractSchema.safeParse(contract({ deadline: { after, policy: 'reject' } })).success).toBe(true);
  });

  it('accepts a gate without deadline, uiSchema or proposalSourceNodeId', () => {
    const { version, actions, schema } = workedExample();

    expect(decisionContractSchema.safeParse({ version, actions, schema }).success).toBe(true);
  });

  it('names the declarable effects when the effect is unknown', () => {
    const result = decisionContractSchema.safeParse(contract({ actions: [{ ...approve, effect: 'escalate' }] }));

    expect(result.success).toBe(false);
    expect(result.success ? '' : result.error.issues[0]?.message).toContain(DECLARABLE_DECISION_EFFECTS.join(', '));
  });

  it.each<{ name: string; input: unknown; path: string }>([
    { name: 'a version other than 1', input: contract({ version: 2 }), path: 'version' },
    { name: 'an empty action list', input: contract({ actions: [] }), path: 'actions' },
    {
      name: 'a duplicate action name',
      input: contract({ actions: [approve, { ...reject, name: 'approve' }] }),
      path: 'actions.1.name',
    },
    {
      name: 'an effect outside the declarable set',
      input: contract({ actions: [{ ...approve, effect: 'escalate' }] }),
      path: 'actions.0.effect',
    },
    {
      name: "a declared 'resume-with-edits'",
      input: contract({ actions: [approve, { ...reject, effect: 'resume-with-edits' }] }),
      path: 'actions.1.effect',
    },
    { name: 'no resume action', input: contract({ actions: [reject] }), path: 'actions' },
    {
      name: 'two resume actions',
      input: contract({ actions: [approve, { ...approve, name: 'approve-2' }] }),
      path: 'actions.1.effect',
    },
    {
      name: 'two reject actions',
      input: contract({ actions: [approve, reject, { ...reject, name: 'decline' }] }),
      path: 'actions.2.effect',
    },
    {
      name: 'two rerun-source actions',
      input: contract({ actions: [approve, reRequest, { ...reRequest, name: 'retry' }] }),
      path: 'actions.2.effect',
    },
    { name: 'an empty action name', input: contract({ actions: [{ ...approve, name: '' }] }), path: 'actions.0.name' },
    {
      name: 'an empty action label',
      input: contract({ actions: [{ ...approve, label: '' }] }),
      path: 'actions.0.label',
    },
    { name: 'an empty resume port', input: contract({ actions: [{ ...approve, port: '' }] }), path: 'actions.0.port' },
    {
      name: "a resume port of 'errorRoute'",
      input: contract({ actions: [{ ...approve, port: 'errorRoute' }] }),
      path: 'actions.0.port',
    },
    {
      name: "a reject port of 'errorRoute'",
      input: contract({ actions: [approve, { ...reject, port: 'errorRoute' }] }),
      path: 'actions.1.port',
    },
    {
      name: 'a reject port equal to the resume port',
      input: contract({ actions: [approve, { ...reject, port: 'approved' }] }),
      path: 'actions.1.port',
    },
    {
      name: 'a non-boolean reasonRequired',
      input: contract({ actions: [approve, { ...reject, reasonRequired: 'yes' }] }),
      path: 'actions.1.reasonRequired',
    },
    {
      name: 'maxIterations below 1',
      input: contract({ actions: [approve, { ...reRequest, maxIterations: 0 }] }),
      path: 'actions.1.maxIterations',
    },
    {
      name: 'a fractional maxIterations',
      input: contract({ actions: [approve, { ...reRequest, maxIterations: 1.5 }] }),
      path: 'actions.1.maxIterations',
    },
    {
      name: "a form schema whose type is not 'object'",
      input: contract({ schema: { ...refundForm, type: 'array' } }),
      path: 'schema.type',
    },
    {
      name: 'a form schema without properties',
      input: contract({ schema: { type: 'object' } }),
      path: 'schema.properties',
    },
    {
      name: 'a form property without a type',
      input: contract({ schema: { type: 'object', properties: { refundAmount: { title: 'Refund amount' } } } }),
      path: 'schema.properties.refundAmount.type',
    },
    {
      name: 'a non-boolean readOnly',
      input: contract({ schema: { type: 'object', properties: { orderDate: { type: 'string', readOnly: 'true' } } } }),
      path: 'schema.properties.orderDate.readOnly',
    },
    {
      name: 'a non-boolean x-pii',
      input: contract({ schema: { type: 'object', properties: { email: { type: 'string', 'x-pii': 'yes' } } } }),
      path: 'schema.properties.email.x-pii',
    },
    {
      name: 'a required field that is not declared',
      input: contract({ schema: { ...refundForm, required: ['discount'] } }),
      path: 'schema.required.0',
    },
    {
      name: 'a required field that exists only on Object.prototype',
      input: contract({ schema: { ...refundForm, required: ['constructor'] } }),
      path: 'schema.required.0',
    },
    {
      name: 'a deadline without a unit',
      input: contract({ deadline: { after: '3', policy: 'reject' } }),
      path: 'deadline.after',
    },
    {
      name: 'a deadline of zero',
      input: contract({ deadline: { after: '0s', policy: 'reject' } }),
      path: 'deadline.after',
    },
    {
      name: 'a negative deadline',
      input: contract({ deadline: { after: '-5m', policy: 'reject' } }),
      path: 'deadline.after',
    },
    {
      name: 'a deadline beyond the protobuf Duration range',
      input: contract({ deadline: { after: '3652501d', policy: 'reject' } }),
      path: 'deadline.after',
    },
    { name: 'a deadline without a policy', input: contract({ deadline: { after: '3d' } }), path: 'deadline.policy' },
    {
      name: "a deadline policy other than 'reject'",
      input: contract({ deadline: { after: '3d', policy: 'escalate' } }),
      path: 'deadline.policy',
    },
    { name: 'a uiSchema that is not an object', input: contract({ uiSchema: 'vertical' }), path: 'uiSchema' },
    {
      name: 'a non-string proposalSourceNodeId',
      input: contract({ proposalSourceNodeId: 42 }),
      path: 'proposalSourceNodeId',
    },
  ])('rejects $name', ({ input, path }) => {
    expect(decisionContractSchema.safeParse(input).success).toBe(false);
    expect(issuePaths(input)).toContain(path);
  });

  it('parses into a value assignable to DecisionContract', () => {
    expectTypeOf<z.infer<typeof decisionContractSchema>>().toMatchTypeOf<DecisionContract>();
  });
});
