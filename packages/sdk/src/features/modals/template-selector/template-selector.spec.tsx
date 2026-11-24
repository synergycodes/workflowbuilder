import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import '../../../bootstrap';
import { setCustomTemplates } from '../../../data/templates';
import type { TemplateModel } from '../../../node/common';
import type { WorkflowBuilderNode } from '../../../node/node-data';
import { resetWorkflowStore, useStore } from '../../../store/store';
import { useChangesTrackerStore } from '../../changes-tracker/stores/use-changes-tracker-store';
import { closeModal } from '../stores/use-modal-store';
import { TemplateSelector } from './template-selector';

vi.mock('../stores/use-modal-store', () => ({ closeModal: vi.fn() }));
vi.mock('@workflow-builder/icons', () => ({ Icon: () => null }));

const kept: WorkflowBuilderNode = {
  id: 'kept',
  position: { x: 0, y: 0 },
  type: 'node',
  data: { type: 'node', icon: 'Plus', properties: {} },
};

const template: TemplateModel = {
  id: 1,
  name: 'Replacement',
  icon: 'Plus',
  value: {
    name: 'replacement',
    layoutDirection: 'RIGHT',
    diagram: { nodes: [{ ...kept, id: 'replaced' }], edges: [], viewport: { x: 0, y: 0, zoom: 1 } },
  },
};

beforeEach(() => {
  vi.clearAllMocks();
  resetWorkflowStore();
  setCustomTemplates([template]);
  useStore.setState({ nodes: [kept] });
});

afterEach(() => {
  setCustomTemplates(null);
});

describe('TemplateSelector', () => {
  it('loads the picked template and closes while the editor is editable', () => {
    render(<TemplateSelector />);

    fireEvent.click(screen.getByText('Replacement'));

    expect(useStore.getState().nodes.map((node) => node.id)).toEqual(['replaced']);
    expect(closeModal).toHaveBeenCalledTimes(1);
  });

  it('keeps the diagram when read-only mode turns on while it is open, and still closes', () => {
    render(<TemplateSelector />);
    const lastChangeName = useChangesTrackerStore.getState().lastChangeName;
    useStore.setState({ isReadOnly: true });

    fireEvent.click(screen.getByText('Replacement'));

    expect(useStore.getState().nodes.map((node) => node.id)).toEqual(['kept']);
    expect(useChangesTrackerStore.getState().lastChangeName).toBe(lastChangeName);
    expect(closeModal).toHaveBeenCalledTimes(1);
  });
});
