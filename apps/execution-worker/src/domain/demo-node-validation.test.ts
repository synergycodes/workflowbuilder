import { describe, expect, it } from 'vitest';

import { DemoNodeValidationError, validateDemoNode } from './demo-node-validation';

describe('validateDemoNode', () => {
  it('validates every supported executable demo node shape', () => {
    const nodes = [
      { id: 'trigger', type: 'trigger', config: {} },
      { id: 'action', type: 'action', config: { type: 'sendEmail' } },
      { id: 'delay', type: 'delay', config: { duration: { amount: 1, unit: 'minutes' } } },
      {
        id: 'conditional',
        type: 'conditional',
        config: { conditionsArray: [{ x: '1', y: '1', comparisonOperator: 'isEqual' }] },
      },
      {
        id: 'decision',
        type: 'decision',
        config: {
          decisionBranches: [
            {
              id: 'yes',
              sourceHandle: 'yes',
              label: 'Yes',
              conditions: [{ x: '1', y: '1', comparisonOperator: 'isEqual' }],
            },
          ],
        },
      },
      { id: 'notification', type: 'notification', config: { type: 'email', recipient: 'person@example.test' } },
      { id: 'ai-agent', type: 'ai-agent', config: { systemPrompt: 'Help.' } },
      { id: 'multi-port', type: 'multi-port', config: {} },
    ];

    expect(nodes.map((node) => validateDemoNode(node).type)).toEqual([
      'trigger',
      'action',
      'delay',
      'conditional',
      'decision',
      'notification',
      'ai-agent',
      'multi-port',
    ]);
  });

  it.each([
    [24, 'hours'],
    [1440, 'minutes'],
    [86_400, 'seconds'],
  ])('allows a delay of exactly 24 hours (%s %s)', (amount, unit) => {
    expect(() =>
      validateDemoNode({ id: 'delay', type: 'delay', config: { duration: { amount, unit } } }),
    ).not.toThrow();
  });

  it('rejects zero, delays over 24 hours, and unsupported units', () => {
    expect(() =>
      validateDemoNode({ id: 'delay', type: 'delay', config: { duration: { amount: 0, unit: 'seconds' } } }),
    ).toThrowError(expect.objectContaining({ code: 'invalid_demo_delay' }));
    expect(() =>
      validateDemoNode({ id: 'delay', type: 'delay', config: { duration: { amount: 24.01, unit: 'hours' } } }),
    ).toThrowError(expect.objectContaining({ code: 'demo_delay_too_long' }));
    expect(() =>
      validateDemoNode({ id: 'delay', type: 'delay', config: { duration: { amount: 1, unit: 'days' } } }),
    ).toThrowError(expect.objectContaining({ code: 'invalid_demo_delay_unit' }));
  });

  it('rejects empty decision conditions and reserved route handles', () => {
    const branch = { id: 'b', sourceHandle: 'branch', label: 'Branch', conditions: [] };
    expect(() =>
      validateDemoNode({ id: 'decision', type: 'decision', config: { decisionBranches: [branch] } }),
    ).toThrowError(expect.objectContaining({ code: 'invalid_demo_decision_branch' }));

    expect(() =>
      validateDemoNode({
        id: 'decision',
        type: 'decision',
        config: {
          decisionBranches: [
            {
              ...branch,
              sourceHandle: 'default',
              conditions: [{ x: 'a', y: 'a', comparisonOperator: 'isEqual' }],
            },
          ],
        },
      }),
    ).toThrowError(expect.objectContaining({ code: 'reserved_demo_decision_handle' }));
  });

  it('returns sanitized validation errors for unsupported node types', () => {
    expect(() => validateDemoNode({ id: 'x', type: 'http-request', config: { secret: 'do-not-log' } })).toThrowError(
      DemoNodeValidationError,
    );
    expect(() => validateDemoNode({ id: 'x', type: 'http-request', config: {} })).toThrowError(
      expect.objectContaining({ code: 'unsupported_demo_node_type' }),
    );
  });
});
