import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import '../../../../../bootstrap';
import type { WorkflowBuilderNode } from '../../../../../node/node-data';
import { resetWorkflowStore, useStore } from '../../../../../store/store';
import { closeModal } from '../../../../modals/stores/use-modal-store';
import { ImportModal } from './import-modal';

vi.mock('../../../../syntax-highlighter/components/syntax-highlighter-lazy', () => ({
  SyntaxHighlighterLazy: ({ value, onChange }: { value: string; onChange: (value: string) => void }) => (
    <textarea aria-label="json" value={value} onChange={(event) => onChange(event.target.value)} />
  ),
}));
vi.mock('../../../../modals/stores/use-modal-store', () => ({ closeModal: vi.fn() }));
vi.mock('../../../../../utils/show-translated-snackbar', () => ({ showTranslatedSnackbar: vi.fn() }));
vi.mock('@workflow-builder/icons', () => ({ Icon: () => null }));

const kept: WorkflowBuilderNode = {
  id: 'kept',
  position: { x: 0, y: 0 },
  type: 'node',
  data: { type: 'node', icon: 'Plus', properties: {} },
};

function importDiagram() {
  fireEvent.change(screen.getByLabelText('json'), {
    target: { value: JSON.stringify({ name: 'imported', nodes: [], edges: [] }) },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Import' }));
}

beforeEach(() => {
  vi.clearAllMocks();
  resetWorkflowStore();
  useStore.setState({ nodes: [kept], workflowName: 'original' });
});

describe('ImportModal', () => {
  it('replaces the diagram and closes while the editor is editable', () => {
    render(<ImportModal />);

    importDiagram();

    expect(useStore.getState().workflowName).toBe('imported');
    expect(closeModal).toHaveBeenCalledTimes(1);
  });

  it('imports nothing when read-only mode turns on while it is open, and still closes', () => {
    render(<ImportModal />);
    useStore.setState({ isReadOnly: true });

    importDiagram();

    expect(useStore.getState().workflowName).toBe('original');
    expect(useStore.getState().nodes.map((node) => node.id)).toEqual(['kept']);
    expect(closeModal).toHaveBeenCalledTimes(1);
  });
});
