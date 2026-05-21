import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { setCustomNodeTemplates } from '../../data/node-templates';
import type { PaletteItem } from '../../node/common';
import type { WorkflowNodeTemplateProps } from '../diagram/nodes/workflow-node-template/workflow-node-template';

vi.mock('../diagram/nodes/ai-agent-node-template/ai-agent-node-template', () => ({
  AiAgentNodeTemplate: () => null,
}));
vi.mock('../diagram/nodes/decision-node-template/decision-node-template', () => ({
  DecisionNodeTemplate: () => null,
}));
vi.mock('../diagram/nodes/start-node-template/start-node-template', () => ({
  StartNodeTemplate: () => null,
}));
vi.mock('../diagram/nodes/workflow-node-template/workflow-node-template', () => ({
  WorkflowNodeTemplate: (props: WorkflowNodeTemplateProps) => <div data-testid="built-in-template">{props.label}</div>,
}));

let mockNodeDefinition: PaletteItem | undefined;

function fakeStoreState() {
  return { getNodeDefinition: () => mockNodeDefinition };
}

vi.mock('../../store/store', () => ({
  useStore: <T,>(selector: (state: { getNodeDefinition: (type: string) => PaletteItem | undefined }) => T) =>
    selector(fakeStoreState()),
}));

function identityTranslate(value: string) {
  return value;
}

vi.mock('../../hooks/use-translate-if-possible', () => ({
  useTranslateIfPossible: () => identityTranslate,
}));

const { NodePreviewContainer } = await import('./node-preview-container');

const baseDefinition: PaletteItem = {
  type: 'multi-port',
  icon: 'Star',
  label: 'Multi Port',
  description: 'Multi-port node',
  defaultPropertiesData: { label: 'Multi Port', description: 'Multi-port node' },
  schema: { type: 'object', properties: {} },
} as unknown as PaletteItem;

describe('NodePreviewContainer', () => {
  beforeEach(() => {
    mockNodeDefinition = baseDefinition;
  });

  afterEach(() => {
    setCustomNodeTemplates(null);
    mockNodeDefinition = undefined;
  });

  it('renders the custom template when one is registered for the palette type', () => {
    function CustomStub(props: WorkflowNodeTemplateProps) {
      return <div data-testid="custom-template">{`${props.label}|${props.description}|${props.id}`}</div>;
    }
    setCustomNodeTemplates({ 'multi-port': CustomStub });

    render(<NodePreviewContainer type="multi-port" />);

    const element = screen.getByTestId('custom-template');
    expect(element.textContent).toBe('Multi Port|Multi-port node|');
    expect(screen.queryByTestId('built-in-template')).toBeNull();
  });

  it('falls back to the built-in template when no custom template matches', () => {
    render(<NodePreviewContainer type="multi-port" />);

    expect(screen.getByTestId('built-in-template')).toBeDefined();
    expect(screen.queryByTestId('custom-template')).toBeNull();
  });

  it('renders nothing when the palette type is unknown', () => {
    mockNodeDefinition = undefined;

    const { container } = render(<NodePreviewContainer type="ghost" />);

    expect(container.firstChild).toBeNull();
  });
});
