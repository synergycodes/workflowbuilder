import { describe, expect, expectTypeOf, it } from 'vitest';
import type { z } from 'zod';

import {
  DECLARABLE_DECISION_EFFECTS,
  type DecisionContract,
} from '@workflow-builder/types/workflow-execution/decision-contract';

import { decisionContractSchema } from './decision-contract-schema';
import { type DecisionIssueCode, decisionIssueMessage } from './decision-issues';

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

function issuesOf(input: unknown): { path: string; message: string }[] {
  const result = decisionContractSchema.safeParse(input);
  return result.success
    ? []
    : result.error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message }));
}

const declarableEffects = DECLARABLE_DECISION_EFFECTS.join(', ');

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

  // `issue` names the dictionary entry expected at `path`; rows without one fail on zod's
  // own structural check.
  it.each<{ name: string; input: unknown; path: string; issue?: { code: DecisionIssueCode; value?: string } }>([
    { name: 'a version other than 1', input: contract({ version: 2 }), path: 'version' },
    {
      name: 'an empty action list',
      input: contract({ actions: [] }),
      path: 'actions',
      issue: { code: 'actions_empty' },
    },
    {
      name: 'a duplicate action name',
      input: contract({ actions: [approve, { ...reject, name: 'approve' }] }),
      path: 'actions.1.name',
      issue: { code: 'duplicate_action_name', value: 'approve' },
    },
    {
      name: 'an effect outside the declarable set',
      input: contract({ actions: [{ ...approve, effect: 'escalate' }] }),
      path: 'actions.0.effect',
      issue: { code: 'unknown_effect', value: declarableEffects },
    },
    {
      name: "a declared 'resume-with-edits'",
      input: contract({ actions: [approve, { ...reject, effect: 'resume-with-edits' }] }),
      path: 'actions.1.effect',
      issue: { code: 'unknown_effect', value: declarableEffects },
    },
    {
      name: 'no resume action',
      input: contract({ actions: [reject] }),
      path: 'actions',
      issue: { code: 'resume_required' },
    },
    {
      name: 'two resume actions',
      input: contract({ actions: [approve, { ...approve, name: 'approve-2' }] }),
      path: 'actions.1.effect',
      issue: { code: 'duplicate_effect', value: 'resume' },
    },
    {
      name: 'two reject actions',
      input: contract({ actions: [approve, reject, { ...reject, name: 'decline' }] }),
      path: 'actions.2.effect',
      issue: { code: 'duplicate_effect', value: 'reject' },
    },
    {
      name: 'two rerun-source actions',
      input: contract({ actions: [approve, reRequest, { ...reRequest, name: 'retry' }] }),
      path: 'actions.2.effect',
      issue: { code: 'duplicate_effect', value: 'rerun-source' },
    },
    {
      name: 'an empty action name',
      input: contract({ actions: [{ ...approve, name: '' }] }),
      path: 'actions.0.name',
      issue: { code: 'name_empty' },
    },
    {
      name: 'an empty action label',
      input: contract({ actions: [{ ...approve, label: '' }] }),
      path: 'actions.0.label',
      issue: { code: 'label_empty' },
    },
    {
      name: 'an empty resume port',
      input: contract({ actions: [{ ...approve, port: '' }] }),
      path: 'actions.0.port',
      issue: { code: 'port_empty' },
    },
    {
      name: "a resume port of 'errorRoute'",
      input: contract({ actions: [{ ...approve, port: 'errorRoute' }] }),
      path: 'actions.0.port',
      issue: { code: 'port_reserved' },
    },
    {
      name: "a reject port of 'errorRoute'",
      input: contract({ actions: [approve, { ...reject, port: 'errorRoute' }] }),
      path: 'actions.1.port',
      issue: { code: 'port_reserved' },
    },
    {
      name: 'a reject port equal to the resume port',
      input: contract({ actions: [approve, { ...reject, port: 'approved' }] }),
      path: 'actions.1.port',
      issue: { code: 'reject_port_equals_resume_port', value: 'approved' },
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
      issue: { code: 'required_field_undeclared', value: 'discount' },
    },
    {
      name: 'a required field that exists only on Object.prototype',
      input: contract({ schema: { ...refundForm, required: ['constructor'] } }),
      path: 'schema.required.0',
      issue: { code: 'required_field_undeclared', value: 'constructor' },
    },
    {
      name: 'a deadline without a unit',
      input: contract({ deadline: { after: '3', policy: 'reject' } }),
      path: 'deadline.after',
      issue: { code: 'deadline_format' },
    },
    {
      name: 'a deadline of zero',
      input: contract({ deadline: { after: '0s', policy: 'reject' } }),
      path: 'deadline.after',
      issue: { code: 'deadline_format' },
    },
    {
      name: 'a negative deadline',
      input: contract({ deadline: { after: '-5m', policy: 'reject' } }),
      path: 'deadline.after',
      issue: { code: 'deadline_format' },
    },
    {
      name: 'a deadline beyond the protobuf Duration range',
      input: contract({ deadline: { after: '3652501d', policy: 'reject' } }),
      path: 'deadline.after',
      issue: { code: 'deadline_format' },
    },
    { name: 'a deadline without a policy', input: contract({ deadline: { after: '3d' } }), path: 'deadline.policy' },
    {
      name: "a deadline policy other than 'reject'",
      input: contract({ deadline: { after: '3d', policy: 'escalate' } }),
      path: 'deadline.policy',
      issue: { code: 'deadline_policy' },
    },
    { name: 'a uiSchema that is not an object', input: contract({ uiSchema: 'vertical' }), path: 'uiSchema' },
    {
      name: 'a non-string proposalSourceNodeId',
      input: contract({ proposalSourceNodeId: 42 }),
      path: 'proposalSourceNodeId',
    },
  ])('rejects $name', ({ input, path, issue }) => {
    const issues = issuesOf(input);
    const atPath = issues.filter((candidate) => candidate.path === path);

    expect(decisionContractSchema.safeParse(input).success).toBe(false);
    expect(atPath.length).toBeGreaterThan(0);
    if (issue !== undefined) {
      expect(atPath.map((candidate) => candidate.message)).toContain(decisionIssueMessage(issue.code, issue.value));
    }
  });

  it('parses into a value assignable to DecisionContract', () => {
    expectTypeOf<z.infer<typeof decisionContractSchema>>().toMatchTypeOf<DecisionContract>();
  });
});
