import {
  migrateLegacyHandleId,
  migrateLegacyHandleIdsOnEdges,
  migrateLegacyHandleIdsOnNodes,
} from './migrate-legacy-handle-id';

describe('migrateLegacyHandleId', () => {
  it('passes through new-format outer handle ids unchanged', () => {
    expect(migrateLegacyHandleId('source')).toBe('source');
    expect(migrateLegacyHandleId('target')).toBe('target');
  });

  it('passes through new-format inner handle ids unchanged', () => {
    expect(migrateLegacyHandleId('source:inner:branch-1')).toBe('source:inner:branch-1');
    expect(migrateLegacyHandleId('target:inner:tool-42')).toBe('target:inner:tool-42');
  });

  it('strips uuid prefix from legacy outer handle ids', () => {
    expect(migrateLegacyHandleId('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa:source')).toBe('source');
    expect(migrateLegacyHandleId('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb:target')).toBe('target');
  });

  it('strips uuid prefix from legacy inner handle ids', () => {
    expect(migrateLegacyHandleId('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa:source:inner:branch-1')).toBe(
      'source:inner:branch-1',
    );
    expect(migrateLegacyHandleId('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb:target:inner:tool-42')).toBe(
      'target:inner:tool-42',
    );
  });

  it('preserves null and undefined', () => {
    expect(migrateLegacyHandleId(null)).toBeNull();
    let value: string | undefined;
    expect(migrateLegacyHandleId(value)).toBeUndefined();
  });

  it('leaves unknown shapes untouched', () => {
    expect(migrateLegacyHandleId('something-weird')).toBe('something-weird');
  });

  it('does not migrate strings ending in :source/:target without a uuid prefix (no false positive)', () => {
    expect(migrateLegacyHandleId('node-1:source')).toBe('node-1:source');
    expect(migrateLegacyHandleId('myCustom:target')).toBe('myCustom:target');
    expect(migrateLegacyHandleId('tenant:org:source')).toBe('tenant:org:source');
  });
});

describe('migrateLegacyHandleIdsOnEdges', () => {
  it('rewrites legacy handle ids on a mixed batch of edges', () => {
    const uuidA = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    const uuidB = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
    const uuidC = 'cccccccc-cccc-cccc-cccc-cccccccccccc';

    const edges = [
      { id: 'e1', source: uuidA, target: uuidB, sourceHandle: `${uuidA}:source`, targetHandle: `${uuidB}:target` },
      {
        id: 'e2',
        source: uuidC,
        target: uuidB,
        sourceHandle: `${uuidC}:source:inner:branch-1`,
        targetHandle: 'target',
      },
      { id: 'e3', source: uuidA, target: uuidB, sourceHandle: 'source', targetHandle: 'target' },
    ];

    const result = migrateLegacyHandleIdsOnEdges(edges);

    expect(result[0].sourceHandle).toBe('source');
    expect(result[0].targetHandle).toBe('target');
    expect(result[1].sourceHandle).toBe('source:inner:branch-1');
    expect(result[1].targetHandle).toBe('target');
    expect(result[2]).toBe(edges[2]);
  });
});

describe('migrateLegacyHandleIdsOnNodes', () => {
  it('rewrites legacy sourceHandle inside nested property arrays (ai-agent tools)', () => {
    const agentUuid = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    const nodes = [
      {
        id: agentUuid,
        data: {
          properties: {
            tools: [
              { id: 'tool-1', sourceHandle: `${agentUuid}:source:inner:tool-1` },
              { id: 'tool-2', sourceHandle: `${agentUuid}:source:inner:tool-2` },
            ],
          },
        },
      },
    ];

    const [migrated] = migrateLegacyHandleIdsOnNodes(nodes);
    const properties = migrated.data.properties as { tools: { sourceHandle: string }[] };

    expect(properties.tools[0].sourceHandle).toBe('source:inner:tool-1');
    expect(properties.tools[1].sourceHandle).toBe('source:inner:tool-2');
  });

  it('rewrites legacy sourceHandle inside decisionBranches', () => {
    const decisionUuid = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
    const nodes = [
      {
        id: decisionUuid,
        data: {
          properties: {
            decisionBranches: [{ id: 'b-1', sourceHandle: `${decisionUuid}:source:inner:b-1` }],
          },
        },
      },
    ];

    const [migrated] = migrateLegacyHandleIdsOnNodes(nodes);
    const properties = migrated.data.properties as { decisionBranches: { sourceHandle: string }[] };

    expect(properties.decisionBranches[0].sourceHandle).toBe('source:inner:b-1');
  });

  it('returns the same node reference when no handle ids change', () => {
    const node = {
      id: 'agent-1',
      data: { properties: { tools: [{ id: 'tool-1', sourceHandle: 'source:inner:tool-1' }] } },
    };

    const [result] = migrateLegacyHandleIdsOnNodes([node]);

    expect(result).toBe(node);
  });

  it('handles nodes without properties gracefully', () => {
    const node = {
      id: 'plain',
      data: { type: 'foo', icon: 'bar' } as Record<string, unknown>,
    };

    const [result] = migrateLegacyHandleIdsOnNodes([node]);

    expect(result).toBe(node);
  });
});
