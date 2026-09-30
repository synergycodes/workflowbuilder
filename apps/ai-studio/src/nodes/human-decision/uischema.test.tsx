import { useChangesTrackerStore, useStore } from '@workflowbuilder/sdk';
import type { WorkflowBuilderEdge, WorkflowBuilderNode } from '@workflowbuilder/sdk';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { humanDecisionNodeType, humanDecisionPaletteItem } from '.';
// SDK internals by path: the public API mounts these only inside a whole <WorkflowBuilder.Root>.
import { registerCustomRenderers } from '../../../../../packages/sdk/src/features/json-form/extension-registry';
import { NodeProperties } from '../../../../../packages/sdk/src/features/properties-bar/components/node-properties/node-properties';
import { decisionActionsRenderer } from '../../components/human-decision/decision-actions/decision-actions-control';
import { decisionFieldsRenderer } from '../../components/human-decision/decision-fields/decision-fields-control';
import { decisionFormRenderer } from '../../components/human-decision/decision-form/decision-form-control';
import { resetExecution } from '../../stores/use-execution-store';
import { defaultPropertiesData } from './default-properties-data';

vi.mock('@workflowbuilder/sdk', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@workflowbuilder/sdk')>();
  return { ...actual, Icon: ({ name }: { name: string }) => <i data-icon={name} /> };
});

registerCustomRenderers([decisionFormRenderer, decisionFieldsRenderer, decisionActionsRenderer]);

const HUMAN = 'human-1';

const human: WorkflowBuilderNode = {
  id: HUMAN,
  type: humanDecisionNodeType,
  position: { x: 350, y: 0 },
  data: {
    segments: [],
    properties: { ...defaultPropertiesData, label: 'Review Refund', description: 'Checks the refund' },
    type: humanDecisionNodeType,
    icon: 'UserCheck',
  },
};

const edges: WorkflowBuilderEdge[] = [];

function Host() {
  const node = useStore((state) => state.nodes.find((candidate) => candidate.id === HUMAN));
  return node ? <NodeProperties node={node} /> : null;
}

const storedProperties = () => useStore.getState().nodes.find((node) => node.id === HUMAN)?.data.properties;

// JsonForms debounces onChange by 10 ms.
const settle = () =>
  act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 40));
  });

// The editor's text controls keep the typing locally and hand the value over on blur.
function commit(element: HTMLInputElement, text: string) {
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(element, text);
  act(() => {
    element.dispatchEvent(new Event('input', { bubbles: true }));
  });
  act(() => {
    element.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
  });
}

describe('the Human task properties panel', () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;
  let dataUpdates = 0;
  let unsubscribe: () => void;

  beforeEach(async () => {
    useStore.setState(useStore.getInitialState(), true);
    resetExecution();
    dataUpdates = 0;
    unsubscribe = useChangesTrackerStore.subscribe((state) => {
      if (state.lastChangeName === 'dataUpdate') dataUpdates += 1;
    });
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    useStore.setState({
      nodes: [human],
      edges,
      selectedNodesIds: [HUMAN],
      selectedEdgesIds: [],
      data: [humanDecisionPaletteItem as never],
    });
    act(() => root.render(<Host />));
    await settle();
  });

  afterEach(() => {
    unsubscribe();
    act(() => root.unmount());
    container.remove();
    useStore.setState(useStore.getInitialState(), true);
    resetExecution();
  });

  const sectionHeaders = () => [...container.querySelectorAll('[aria-expanded]')].map((element) => element.textContent);
  const input = (placeholder: string) => {
    const found = container.querySelector<HTMLInputElement>(`input[placeholder="${placeholder}"]`);
    if (!found) throw new Error(`no field with the placeholder ${placeholder}`);
    return found;
  };

  it('opens with General information, then the fields the decider sees, then the decider actions', () => {
    expect(sectionHeaders()).toEqual(['General information', 'Fields the decider sees', 'Decider actions']);
  });

  it("groups the node's title and description, and no Status field", () => {
    expect(input('Node Title...').value).toBe('Review Refund');
    expect(input('Type your description here...').value).toBe('Checks the refund');
    expect(container.textContent).not.toContain('Status');
  });

  it('a description is stored on the node as one undo step, leaving the request alone', async () => {
    commit(input('Type your description here...'), 'A person approves the refund');
    await settle();

    expect(storedProperties()?.['description']).toBe('A person approves the refund');
    expect(storedProperties()?.['decisionRequest']).toBe(defaultPropertiesData.decisionRequest);
    expect(dataUpdates).toBe(1);
  });
});
