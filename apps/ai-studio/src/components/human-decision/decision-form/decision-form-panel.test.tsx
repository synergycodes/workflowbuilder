import { useSingleSelectedElement, useStore } from '@workflowbuilder/sdk';
import type { WorkflowBuilderEdge, WorkflowBuilderNode } from '@workflowbuilder/sdk';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// SDK internals by path: the public API mounts these only inside a whole <WorkflowBuilder.Root>.
import { registerCustomRenderers } from '../../../../../../packages/sdk/src/features/json-form/extension-registry';
import { PropertiesBar } from '../../../../../../packages/sdk/src/features/properties-bar/components/properties-bar/properties-bar';
import { submitDecision } from '../../../adapters/submit-decision';
import { humanDecisionNodeType, humanDecisionPaletteItem } from '../../../nodes/human-decision';
import { plugin } from '../../../plugin';
import { executionEvent as event } from '../../../stores/execution-event.fixture';
import { applyEvent, resetExecution, setExecutionStarted } from '../../../stores/use-execution-store';
import { reviewRequest } from '../../../utils/human-decision/review-request.fixture';
import { decisionActionsRenderer } from '../decision-actions/decision-actions-control';
import { decisionFieldsRenderer } from '../decision-fields/decision-fields-control';
import { decisionFormRenderer } from './decision-form-control';

vi.mock('@workflowbuilder/sdk', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@workflowbuilder/sdk')>();
  return { ...actual, Icon: ({ name }: { name: string }) => <i data-icon={name} /> };
});

vi.mock('../../../adapters/submit-decision', () => ({ submitDecision: vi.fn() }));
const submit = vi.mocked(submitDecision);

registerCustomRenderers([decisionFormRenderer, decisionFieldsRenderer, decisionActionsRenderer]);
plugin();

function agent(id: string): WorkflowBuilderNode {
  return {
    id,
    type: 'node',
    position: { x: 0, y: 0 },
    data: {
      segments: [],
      properties: { label: id, description: '', systemPrompt: '', webSearch: false },
      type: 'ai-studio/ai-agent',
      icon: 'AiAgent',
    },
  };
}

// A decision node whose decider sees one editable text field.
function human(id: string, field: string, title: string): WorkflowBuilderNode {
  const decisionRequest = {
    ...reviewRequest,
    schema: { type: 'object', properties: { [field]: { type: 'string', title } } },
  };
  return {
    id,
    type: humanDecisionNodeType,
    position: { x: 350, y: 0 },
    data: {
      segments: [],
      properties: { label: title, description: '', decisionRequest },
      type: humanDecisionNodeType,
      icon: 'UserCheck',
    },
  };
}

function edge(source: string, target: string): WorkflowBuilderEdge {
  return {
    id: `${source}-${target}`,
    source,
    sourceHandle: 'source',
    target,
    targetHandle: 'target',
    type: 'labelEdge',
    data: {},
  };
}

// The SDK's own panel, with AI Studio's decorator on it: one panel, its content kept from one selected node to the next.
function Host() {
  return (
    <PropertiesBar
      selection={useSingleSelectedElement()}
      headerLabel="Properties"
      deleteNodeLabel="Delete node"
      deleteEdgeLabel="Delete edge"
      selectedTab="properties"
      onTabChange={() => {}}
      onDeleteClick={() => {}}
    />
  );
}

// What a click on the canvas calls.
function select(nodeId: string) {
  act(() => {
    const { nodes, onSelectionChange } = useStore.getState();
    onSelectionChange({ nodes: nodes.filter((node) => node.id === nodeId), edges: [] });
  });
}

// JsonForms debounces onChange by 10 ms.
const settle = () =>
  act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 40));
  });

async function click(element: Element) {
  await act(async () => {
    element.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
}

// The editor's text controls keep the typing locally and hand the value over on blur.
function commit(element: HTMLInputElement | HTMLTextAreaElement, text: string) {
  const prototype = element instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(prototype, 'value')?.set?.call(element, text);
  act(() => {
    element.dispatchEvent(new Event('input', { bubbles: true }));
  });
  act(() => {
    element.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
  });
}

describe('the decision form in the real properties panel, as the selection moves between two waiting decisions', () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;

  beforeEach(() => {
    useStore.setState(useStore.getInitialState(), true);
    resetExecution();
    submit.mockReset();
    submit.mockResolvedValue({ ok: true });
    useStore.setState({
      nodes: [agent('draft-1'), human('human-1', 'alpha', 'Alpha'), agent('draft-2'), human('human-2', 'beta', 'Beta')],
      edges: [edge('draft-1', 'human-1'), edge('draft-2', 'human-2')],
      data: [humanDecisionPaletteItem as never],
    });
    act(() => {
      setExecutionStarted('exec-1', 'http://backend/stream');
      applyEvent(event({ type: 'node_completed', nodeId: 'draft-1', payload: { output: { alpha: 'first' } } }));
      applyEvent(event({ type: 'node_waiting', nodeId: 'human-1' }));
      applyEvent(event({ type: 'node_completed', nodeId: 'draft-2', payload: { output: { beta: 'second' } } }));
      applyEvent(event({ type: 'node_waiting', nodeId: 'human-2' }));
    });
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    act(() => root.render(<Host />));
  });

  afterEach(async () => {
    await settle();
    act(() => root.unmount());
    container.remove();
    useStore.setState(useStore.getInitialState(), true);
    resetExecution();
  });

  // A row of the decider's form is found by its label, the way a person finds it.
  const formField = (label: string) =>
    [...container.querySelectorAll('[data-decision-form] span')]
      .find((span) => span.childElementCount === 0 && span.textContent === label)
      ?.parentElement?.parentElement?.querySelector<HTMLInputElement | HTMLTextAreaElement>('input, textarea') ??
    undefined;
  const button = (label: string) =>
    [...container.querySelectorAll('button')].find((candidate) => candidate.textContent?.trim() === label);
  const approve = () => button('Approve')!;

  it("puts Approve in the panel's footer, outside the form's scrolling fields, and shows no Delete", async () => {
    select('human-1');
    await settle();

    expect(formField('Alpha')).toBeDefined();
    expect(approve().closest('[data-decision-form]')).toBeNull();
    expect(button('Delete node')).toBeUndefined();
  });

  it('shows the field of the node the selection lands on, not the one it left', async () => {
    select('human-1');
    await settle();
    select('human-2');
    await settle();

    expect(formField('Alpha')).toBeUndefined();
    expect(formField('Beta')?.value).toBe('second');
  });

  it("sends the edit under the node's own field", async () => {
    select('human-1');
    await settle();
    select('human-2');
    await settle();

    const beta = formField('Beta');
    expect(beta).toBeDefined();
    commit(beta!, 'edited');
    await settle();
    await click(approve());

    expect(submit).toHaveBeenCalledWith(
      { executionId: 'exec-1', nodeId: 'human-2', attempt: 1 },
      { action: 'approve', edits: { beta: 'edited' } },
    );
  });
});
