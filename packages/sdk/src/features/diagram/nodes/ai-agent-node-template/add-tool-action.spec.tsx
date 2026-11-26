import { beforeEach, describe, expect, it, vi } from 'vitest';

import '../../../../bootstrap';
import type { WorkflowBuilderNode } from '../../../../node/node-data';
import { resetWorkflowStore, useStore } from '../../../../store/store';
import { openAddToolModal } from '../../../json-form/controls/ai-tools-control/open-add-tool-modal';
import type { AiAgentTool } from '../../../json-form/types/controls';
import { closeModal } from '../../../modals/stores/use-modal-store';
import { openAddToolModalForNode } from './add-tool-action';

vi.mock('../../../json-form/controls/ai-tools-control/open-add-tool-modal', () => ({ openAddToolModal: vi.fn() }));
vi.mock('../../../modals/stores/use-modal-store', () => ({ closeModal: vi.fn() }));

const agent: WorkflowBuilderNode = {
  id: 'a1',
  position: { x: 0, y: 0 },
  type: 'ai-agent',
  data: { type: 'ai-agent', icon: 'Robot', properties: { tools: [] } },
};

const tool = { tool: 'search' } as AiAgentTool;

const toolCount = () => (useStore.getState().nodes[0]?.data.properties.tools as unknown[]).length;

function submitFromModal(change: AiAgentTool) {
  const [onSubmit] = vi.mocked(openAddToolModal).mock.calls[0]!;
  onSubmit(change);
}

beforeEach(() => {
  vi.clearAllMocks();
  resetWorkflowStore();
  useStore.setState({ nodes: [agent] });
});

describe('openAddToolModalForNode', () => {
  it('appends the submitted tool and closes the modal while the editor is editable', () => {
    openAddToolModalForNode('a1');
    submitFromModal(tool);

    expect(toolCount()).toBe(1);
    expect(closeModal).toHaveBeenCalledTimes(1);
  });

  it('does not open the modal in read-only mode', () => {
    useStore.setState({ isReadOnly: true });

    openAddToolModalForNode('a1');

    expect(openAddToolModal).not.toHaveBeenCalled();
  });

  it('writes nothing when read-only mode turns on while the modal is open, and still closes it', () => {
    openAddToolModalForNode('a1');
    useStore.setState({ isReadOnly: true });

    submitFromModal(tool);

    expect(toolCount()).toBe(0);
    expect(closeModal).toHaveBeenCalledTimes(1);
  });
});
