import { render, screen } from '@testing-library/react';
import type { ComponentType, ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { PaletteItem } from '../../../node/common';
import { resetWorkflowStore, useStore } from '../../../store/store';
import { AiNodeContainer } from './ai-node-container';
import { DecisionNodeContainer } from './decision-node-container';
import { NodeContainer } from './node-container';
import { StartContainer } from './start-node-container';

const templateMock = vi.hoisted(() => ({
  Template: ({ accent }: { accent?: string }) => <span data-testid="template" data-accent={accent ?? ''} />,
}));

vi.mock('@workflowbuilder/ui', () => ({
  NodeAsPortWrapper: ({ children }: { children?: ReactNode }) => <>{children}</>,
}));
vi.mock('./workflow-node-template/workflow-node-template', () => ({ WorkflowNodeTemplate: templateMock.Template }));
vi.mock('./start-node-template/start-node-template', () => ({ StartNodeTemplate: templateMock.Template }));
vi.mock('./decision-node-template/decision-node-template', () => ({ DecisionNodeTemplate: templateMock.Template }));
vi.mock('./ai-agent-node-template/ai-agent-node-template', () => ({ AiAgentNodeTemplate: templateMock.Template }));
vi.mock('./decision-node-template/add-branch-action', () => ({ addBranchToNode: vi.fn() }));
vi.mock('./ai-agent-node-template/add-tool-action', () => ({ openAddToolModalForNode: vi.fn() }));

type Container = ComponentType<Record<string, unknown>>;

const containers = Object.entries({
  NodeContainer,
  StartContainer,
  DecisionNodeContainer,
  AiNodeContainer,
}) as unknown as [string, Container][];

function renderContainer(Container: Container) {
  const props = {
    id: 'node-1',
    selected: false,
    data: { type: 'my-product/node', icon: 'Plus', properties: { label: 'Node' } },
  };
  render(<Container {...props} />);
  return screen.getByTestId('template').dataset.accent;
}

beforeEach(() => {
  resetWorkflowStore();
});

describe.each(containers)('%s', (_name, Container) => {
  it('passes the accent of the definition of data.type, which the saved data does not carry', () => {
    useStore.setState({
      data: [{ type: 'my-product/node', label: 'Node', icon: 'Plus', accent: 'green' } as PaletteItem],
    });

    expect(renderContainer(Container)).toBe('green');
  });

  it('passes no accent when the definition sets none', () => {
    useStore.setState({ data: [{ type: 'my-product/node', label: 'Node', icon: 'Plus' } as PaletteItem] });

    expect(renderContainer(Container)).toBe('');
  });
});
