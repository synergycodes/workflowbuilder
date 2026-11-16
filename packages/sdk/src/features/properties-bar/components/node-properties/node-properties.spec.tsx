import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { PaletteItem } from '../../../../node/common';
import { StatusType } from '../../../../node/common';
import type { WorkflowBuilderNode } from '../../../../node/node-data';
import { resetWorkflowStore, useStore } from '../../../../store/store';
import '../../../i18n/index';
import { NodeProperties } from './node-properties';

vi.mock('@workflow-builder/icons', () => ({ Icon: ({ name }: { name: string }) => <i data-icon={name} /> }));

function definition(type: string, modes: string[]) {
  return {
    type,
    label: type,
    icon: 'Lightning',
    description: '',
    defaultPropertiesData: {},
    schema: {
      type: 'object',
      properties: {
        mode: { type: 'string', options: modes.map((value) => ({ value, label: value })) },
        note: { type: 'string' },
      },
    },
    uischema: {
      type: 'VerticalLayout',
      elements: [
        { type: 'Select', scope: '#/properties/mode' },
        { type: 'Text', scope: '#/properties/note' },
      ],
    },
  } as unknown as PaletteItem;
}

function node(id: string, type: string, properties: { mode: string; note?: string }) {
  return {
    id,
    type: 'node',
    position: { x: 0, y: 0 },
    data: { type, icon: 'Lightning', properties: { label: id, ...properties } },
  } as unknown as WorkflowBuilderNode;
}

function SelectedNodeProperties({ nodeId }: { nodeId: string }) {
  const selected = useStore((state) => state.nodes.find((candidate) => candidate.id === nodeId));
  return selected ? <NodeProperties node={selected} /> : null;
}

const setNodeProperties = vi.fn();

function storedProperties(nodeId: string) {
  return useStore.getState().nodes.find((candidate) => candidate.id === nodeId)!.data.properties;
}

// Covers Base UI mounting its hidden options after focus and JSON Forms reporting a change.
const settle = () => act(() => vi.advanceTimersByTimeAsync(100));

function renderPanel(nodeId: string) {
  const view = render(<SelectedNodeProperties nodeId={nodeId} />);
  return {
    select: () => view.container.querySelector<HTMLElement>('[role="combobox"]')!,
    textInput: () => view.container.querySelector<HTMLInputElement>('input[type="text"]')!,
    showNode: (id: string) => view.rerender(<SelectedNodeProperties nodeId={id} />),
  };
}

// Base UI opens its list and picks an option on the pointer sequence, not on `click` alone.
function press(element: HTMLElement) {
  act(() => {
    for (const type of ['pointerdown', 'mousedown', 'pointerup', 'mouseup']) {
      element.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true }));
    }
    element.click();
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  resetWorkflowStore();
  const writeToStore = useStore.getState().setNodeProperties;
  setNodeProperties.mockReset().mockImplementation(writeToStore);
  useStore.setState({
    fetchDataStatus: StatusType.Success,
    data: [definition('three-modes', ['a1', 'a2', 'a3']), definition('one-mode', ['b1'])],
    nodes: [
      node('three', 'three-modes', { mode: 'a2' }),
      node('one', 'one-mode', { mode: 'b1' }),
      node('other-three', 'three-modes', { mode: 'a3' }),
    ],
    setNodeProperties,
  });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('NodeProperties keeps each node its own form', () => {
  it.each([
    ['fewer options', 'three', 'one'],
    ['more options', 'one', 'three'],
  ])('showing a node with %s after a Select was focused writes nothing', async (_name, first, second) => {
    const panel = renderPanel(first);
    await settle();
    act(() => panel.select().focus());
    await settle();

    panel.showNode(second);
    await settle();
    panel.showNode(first);
    await settle();

    expect(setNodeProperties).not.toHaveBeenCalled();
    expect(panel.select().textContent).toBe(storedProperties(first).mode);
  });

  it('a value picked in a Select stays on its node after the selection moves and comes back', async () => {
    const panel = renderPanel('three');
    await settle();
    press(panel.select());
    await settle();
    press(screen.getByRole('option', { name: 'a1' }));

    panel.showNode('one');
    await settle();
    panel.showNode('three');
    await settle();

    expect(storedProperties('three').mode).toBe('a1');
    expect(storedProperties('one').mode).toBe('b1');
    expect(panel.select().textContent).toBe('a1');
  });

  it('text typed but not committed does not follow the selection to another node', async () => {
    const panel = renderPanel('three');
    await settle();
    fireEvent.change(panel.textInput(), { target: { value: 'typed on three' } });

    panel.showNode('other-three');
    await settle();

    expect(panel.textInput().value).toBe('');
    fireEvent.blur(panel.textInput());
    await settle();
    expect(setNodeProperties).not.toHaveBeenCalled();
  });

  it('an edit committed right before the selection changes is written to the edited node', async () => {
    const panel = renderPanel('three');
    await settle();
    fireEvent.change(panel.textInput(), { target: { value: 'committed on three' } });
    fireEvent.blur(panel.textInput());

    panel.showNode('other-three');
    await settle();

    expect(setNodeProperties).toHaveBeenCalledTimes(1);
    expect(storedProperties('three').note).toBe('committed on three');
    expect(storedProperties('other-three').note).toBeUndefined();
  });
});
