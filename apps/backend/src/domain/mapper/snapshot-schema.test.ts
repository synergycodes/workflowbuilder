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

  it('keeps `data.isStartNode` so entrypoints stay identifiable', () => {
    const snapshot = {
      nodes: [{ id: 'n1', data: { type: 'my-product/trigger', isStartNode: true } }],
      edges: [],
    };

    const result = workflowSnapshotSchema.parse(snapshot);
    expect(result.nodes[0]!.data.isStartNode).toBe(true);
  });

  it("strips the editor's node kind — it is a rendering detail, not an entrypoint marker", () => {
    const snapshot = {
      nodes: [{ id: 'n1', type: 'start-node', data: { type: 'my-product/trigger' } }],
      edges: [],
    };

    const result = workflowSnapshotSchema.parse(snapshot);
    expect(result.nodes[0]).not.toHaveProperty('type');
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
  it('copies every property the runner does not lift into `config`', () => {
    const snapshot = workflowSnapshotSchema.parse({
      nodes: [
        {
          id: 'n1',
          data: {
            type: 'product/foo',
            properties: { foo: 1, bar: 'two', extra: { ui: 'metadata' }, label: 'Lifted', errorPolicy: 'continue' },
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
        label: 'Lifted',
        errorPolicy: 'continue',
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

  it("lifts `data.isStartNode` to role 'start'", () => {
    const result = mapToExecutionModel('wf-1', {
      nodes: [
        // Any node type can be an entrypoint — the flag is what counts, not the
        // product type or the visual template it renders with.
        { id: 'n1', data: { type: 'my-product/action', isStartNode: true } },
        { id: 'n2', data: { type: 'my-product/action', isStartNode: false } },
        { id: 'n3', data: { type: 'my-product/action' } },
      ],
      edges: [],
    });

    // Only the flagged node carries a role; the runner reads it to pick the
    // entrypoint instead of inferring one from in-degree.
    expect(result.nodes[0]!.role).toBe('start');
    expect(result.nodes[1]!.role).toBeUndefined();
    expect(result.nodes[2]!.role).toBeUndefined();
  });

  it('gives a legacy start-node kind no role — the flag is the only marker', () => {
    // Diagrams saved before the flag existed marked their entrypoint with the
    // editor's node kind alone. Those no longer resolve, and the runner rejects
    // them with "Workflow has no start node" until the node is re-created.
    const snapshot = workflowSnapshotSchema.parse({
      nodes: [{ id: 'n1', type: 'start-node', data: { type: 'my-product/trigger' } }],
      edges: [],
    });

    const result = mapToExecutionModel('wf-1', snapshot);

    expect(result.nodes[0]!.role).toBeUndefined();
  });

  it('keeps the entrypoint flag out of `config`', () => {
    const snapshot = workflowSnapshotSchema.parse({
      nodes: [{ id: 'n1', data: { type: 'my-product/trigger', isStartNode: true, properties: { foo: 1 } } }],
      edges: [],
    });

    const result = mapToExecutionModel('wf-1', snapshot);

    expect(result.nodes[0]!.config).toEqual({ foo: 1 });
  });

  it('lifts the authored label out of `config`', () => {
    const snapshot = workflowSnapshotSchema.parse({
      nodes: [
        {
          id: 'n1',
          data: { type: 'my-product/action', properties: { label: 'Fetch order', description: 'why', foo: 1 } },
        },
      ],
      edges: [],
    });

    const result = mapToExecutionModel('wf-1', snapshot);

    expect(result.nodes[0]!.label).toBe('Fetch order');
    expect(result.nodes[0]!.config).toEqual({ description: 'why', foo: 1 });
  });

  it('trims the label and drops a blank one', () => {
    // An empty Summary renders as nothing; no Summary falls back to the activity type.
    const snapshot = workflowSnapshotSchema.parse({
      nodes: [
        { id: 'n1', data: { type: 'my-product/action', properties: { label: '  Approve  ' } } },
        { id: 'n2', data: { type: 'my-product/action', properties: { label: '   ' } } },
        { id: 'n3', data: { type: 'my-product/action', properties: { label: '' } } },
        { id: 'n4', data: { type: 'my-product/action', properties: {} } },
      ],
      edges: [],
    });

    const result = mapToExecutionModel('wf-1', snapshot);

    expect(result.nodes[0]!.label).toBe('Approve');
    expect(result.nodes[1]).not.toHaveProperty('label');
    expect(result.nodes[2]).not.toHaveProperty('label');
    expect(result.nodes[3]).not.toHaveProperty('label');
  });

  it('ignores a non-string label rather than forwarding it', () => {
    // `properties` is `Record<string, unknown>` at the boundary.
    const snapshot = workflowSnapshotSchema.parse({
      nodes: [{ id: 'n1', data: { type: 'my-product/action', properties: { label: { nested: true } } } }],
      edges: [],
    });

    const result = mapToExecutionModel('wf-1', snapshot);

    expect(result.nodes[0]).not.toHaveProperty('label');
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
