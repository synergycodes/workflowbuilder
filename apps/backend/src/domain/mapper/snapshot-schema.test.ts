import { describe, expect, it } from 'vitest';

import { mapToExecutionModel } from './from-integration-data';
import { workflowSnapshotSchema } from './snapshot-schema';

describe('workflowSnapshotSchema', () => {
  it('accepts a structurally valid snapshot regardless of node type vocabulary', () => {
    const snapshot = {
      nodes: [
        { id: 'n1', data: { type: 'my-product/source', properties: { x: 1 } } },
        { id: 'n2', data: { type: 'unknown/whatever', properties: {} } },
      ],
      edges: [{ id: 'e1', source: 'n1', target: 'n2' }],
    };

    expect(workflowSnapshotSchema.safeParse(snapshot).success).toBe(true);
  });

  it('rejects a node missing `id`', () => {
    const snapshot = {
      nodes: [{ data: { type: 'x/y' } }],
      edges: [],
    };

    const result = workflowSnapshotSchema.safeParse(snapshot);
    expect(result.success).toBe(false);
  });

  it('rejects a node missing `data.type`', () => {
    const snapshot = {
      nodes: [{ id: 'n1', data: { properties: {} } }],
      edges: [],
    };

    const result = workflowSnapshotSchema.safeParse(snapshot);
    expect(result.success).toBe(false);
  });

  it('rejects an edge missing `source` or `target`', () => {
    const missingTarget = workflowSnapshotSchema.safeParse({
      nodes: [],
      edges: [{ id: 'e1', source: 'n1' }],
    });
    const missingSource = workflowSnapshotSchema.safeParse({
      nodes: [],
      edges: [{ id: 'e1', target: 'n2' }],
    });

    expect(missingTarget.success).toBe(false);
    expect(missingSource.success).toBe(false);
  });

  it('accepts edges with optional or null `sourceHandle`', () => {
    const omitted = workflowSnapshotSchema.safeParse({
      nodes: [],
      edges: [{ id: 'e1', source: 'a', target: 'b' }],
    });
    const explicitNull = workflowSnapshotSchema.safeParse({
      nodes: [],
      edges: [{ id: 'e2', source: 'a', target: 'b', sourceHandle: null }],
    });
    const explicitString = workflowSnapshotSchema.safeParse({
      nodes: [],
      edges: [{ id: 'e3', source: 'a', target: 'b', sourceHandle: 'branch-1' }],
    });

    expect(omitted.success).toBe(true);
    expect(explicitNull.success).toBe(true);
    expect(explicitString.success).toBe(true);
  });

  it('accepts arbitrarily nested properties (passed through opaquely)', () => {
    const snapshot = {
      nodes: [
        {
          id: 'n1',
          data: {
            type: 'product/decision',
            properties: {
              decisionBranches: [
                {
                  sourceHandle: 'b1',
                  conditions: [{ x: 'a', y: 'b', comparisonOperator: 'isEqual' }],
                },
              ],
              meta: { custom: { deeply: { nested: true } } },
            },
          },
        },
      ],
      edges: [],
    };

    expect(workflowSnapshotSchema.safeParse(snapshot).success).toBe(true);
  });
});

describe('mapToExecutionModel', () => {
  it('maps `data.properties` to `config` verbatim — no per-type extraction', () => {
    const snapshot = workflowSnapshotSchema.parse({
      nodes: [
        {
          id: 'n1',
          data: {
            type: 'product/foo',
            properties: { foo: 1, bar: 'two', extra: { ui: 'metadata' } },
          },
        },
      ],
      edges: [],
    });

    const result = mapToExecutionModel('wf-1', snapshot);

    expect(result.nodes).toEqual([
      {
        id: 'n1',
        type: 'product/foo',
        config: { foo: 1, bar: 'two', extra: { ui: 'metadata' } },
      },
    ]);
  });

  it('defaults `config` to `{}` when properties are absent', () => {
    const snapshot = workflowSnapshotSchema.parse({
      nodes: [{ id: 'n1', data: { type: 'product/empty' } }],
      edges: [],
    });

    const result = mapToExecutionModel('wf-1', snapshot);

    expect(result.nodes[0]?.config).toEqual({});
  });

  it('renames edge fields and normalises null sourceHandle to undefined', () => {
    const snapshot = workflowSnapshotSchema.parse({
      nodes: [],
      edges: [
        { id: 'e1', source: 'a', target: 'b' },
        { id: 'e2', source: 'a', target: 'c', sourceHandle: null },
        { id: 'e3', source: 'a', target: 'd', sourceHandle: 'branch-x' },
      ],
    });

    const result = mapToExecutionModel('wf-1', snapshot);

    expect(result.edges).toEqual([
      { id: 'e1', sourceNodeId: 'a', targetNodeId: 'b', sourceHandle: undefined },
      { id: 'e2', sourceNodeId: 'a', targetNodeId: 'c', sourceHandle: undefined },
      { id: 'e3', sourceNodeId: 'a', targetNodeId: 'd', sourceHandle: 'branch-x' },
    ]);
  });

  it('passes unknown node types through unchanged — backend does not know any vocabulary', () => {
    // The whole point of the structural mapper: a type the backend has never
    // heard of reaches the worker, where the registry-miss becomes a
    // node_failed event with the missing-executor message.
    const snapshot = workflowSnapshotSchema.parse({
      nodes: [{ id: 'n1', data: { type: 'never-seen-before/v3', properties: { x: 1 } } }],
      edges: [],
    });

    const result = mapToExecutionModel('wf-1', snapshot);

    expect(result.nodes[0]?.type).toBe('never-seen-before/v3');
  });
});
