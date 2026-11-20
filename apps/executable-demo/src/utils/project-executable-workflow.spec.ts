import { describe, expect, it } from 'vitest';

import { DEFAULT_DECISION_HANDLE, projectExecutableWorkflow } from './project-executable-workflow';

const start = {
  id: 'start',
  data: { type: 'trigger', isStartNode: true, properties: { label: 'Start', apiKey: 'secret' } },
};

function edge(id: string, source: string, target: string, sourceHandle = 'source') {
  return { id, source, target, sourceHandle, targetHandle: 'target', data: { label: 'visual only' } };
}

describe('projectExecutableWorkflow', () => {
  it('whitelists executable config and strips unsafe legacy fields recursively', () => {
    const nodes = [
      start,
      {
        id: 'ai',
        position: { x: 1, y: 2 },
        measured: { width: 10, height: 10 },
        data: {
          type: 'ai-agent',
          icon: 'AiAgent',
          properties: {
            label: 'AI',
            description: 'desc',
            systemPrompt: 'Safe prompt',
            apiKey: 'secret',
            tools: [{ apiKey: 'nested', url: 'https://unsafe.invalid', script: 'rm -rf' }],
            credentials: { token: 'secret' },
            endpointUrl: 'https://unsafe.invalid',
            script: 'alert(1)',
            errorPolicy: 'continue',
          },
        },
      },
    ];

    expect(projectExecutableWorkflow(nodes, [edge('e', 'start', 'ai')])).toEqual({
      nodes: [
        { id: 'start', data: { type: 'trigger', isStartNode: true, properties: {} } },
        {
          id: 'ai',
          data: { type: 'ai-agent', properties: { systemPrompt: 'Safe prompt', errorPolicy: 'continue' } },
        },
      ],
      edges: [{ id: 'e', source: 'start', target: 'ai', sourceHandle: 'source' }],
    });
  });

  it('requires true and false conditional routes', () => {
    const condition = {
      id: 'condition',
      data: {
        type: 'conditional',
        properties: { conditionsArray: [{ x: '1', comparisonOperator: 'isEqual', y: '1' }] },
      },
    };
    const leaf = { id: 'leaf', data: { type: 'action', properties: { type: 'task' } } };

    expect(() =>
      projectExecutableWorkflow(
        [start, condition, leaf],
        [edge('to-condition', 'start', 'condition'), edge('only-true', 'condition', 'leaf', 'true')],
      ),
    ).toThrow('unconnected branch handle(s): false');
  });

  it('requires every custom decision route and the permanent default route', () => {
    const decision = {
      id: 'decision',
      data: {
        type: 'decision',
        properties: {
          decisionBranches: [
            {
              id: 'yes-branch',
              sourceHandle: 'source:inner:yes',
              label: 'Yes',
              conditions: [{ x: 'yes', comparisonOperator: 'isEqual', y: 'yes' }],
            },
          ],
        },
      },
    };
    const leaf = { id: 'leaf', data: { type: 'action', properties: { type: 'task' } } };

    expect(() =>
      projectExecutableWorkflow(
        [start, decision, leaf],
        [edge('to-decision', 'start', 'decision'), edge('yes', 'decision', 'leaf', 'source:inner:yes')],
      ),
    ).toThrow(`unconnected branch handle(s): ${DEFAULT_DECISION_HANDLE}`);
  });

  it('rejects non-positive delays and delays longer than 24 hours', () => {
    const delay = {
      id: 'delay',
      data: { type: 'delay', properties: { duration: { amount: 25, unit: 'hours' } } },
    };
    expect(() => projectExecutableWorkflow([start, delay], [edge('e', 'start', 'delay')])).toThrow(
      'exceeds the 24 hour maximum',
    );
    expect(() =>
      projectExecutableWorkflow(
        [start, { ...delay, data: { type: 'delay', properties: { duration: { amount: 0, unit: 'seconds' } } } }],
        [edge('e', 'start', 'delay')],
      ),
    ).toThrow('must be greater than zero');
  });

  it('preserves SDK global variable definitions in the projected snapshot', () => {
    const globals = {
      threshold: {
        id: 'threshold',
        name: 'Threshold',
        type: 'number' as const,
        defaultValue: '10',
        description: '',
      },
    };

    expect(projectExecutableWorkflow([start], [], globals)).toEqual({
      nodes: [{ id: 'start', data: { type: 'trigger', isStartNode: true, properties: {} } }],
      edges: [],
      globalVariables: globals,
    });
  });
});
