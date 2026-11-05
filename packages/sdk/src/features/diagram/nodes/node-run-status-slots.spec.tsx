import { render, screen } from '@testing-library/react';
import type { ComponentType } from 'react';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import type { WorkflowBuilderDecoratorWrapperProps } from '../../plugins-core/adapters/adapter-components';

vi.mock('@workflowbuilder/ui', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  Status: ({ status }: { status?: string }) => (status ? <span data-testid="notify" /> : null),
}));

vi.mock('@xyflow/react', () => ({
  Handle: () => null,
  Position: { Left: 'left', Right: 'right', Top: 'top', Bottom: 'bottom' },
}));

type SlotProps = { nodeId: string };

const nodeProps = { id: 'node-1', icon: 'Play', label: 'Send email', description: '' } as const;

type TemplateProps = typeof nodeProps & { isValid?: boolean; showHandles?: boolean };

// The decorator registry is module state: a fresh module graph per test keeps registrations from leaking.
async function load() {
  vi.resetModules();
  const { registerComponentDecorator } = await import('../../plugins-core/adapters/adapter-components');
  const { WorkflowNodeTemplate } = await import('./workflow-node-template/workflow-node-template');
  const { StartNodeTemplate } = await import('./start-node-template/start-node-template');
  const { DecisionNodeTemplate } = await import('./decision-node-template/decision-node-template');
  const { AiAgentNodeTemplate } = await import('./ai-agent-node-template/ai-agent-node-template');

  const templates: Record<string, ComponentType<TemplateProps>> = {
    WorkflowNodeTemplate,
    StartNodeTemplate,
    DecisionNodeTemplate,
    AiAgentNodeTemplate,
  };

  return { registerComponentDecorator, templates, WorkflowNodeTemplate };
}

describe('node run status slots', () => {
  // The first import transforms the whole template graph, which can outlast the default test timeout.
  beforeAll(load, 60_000);

  it('a wrapper decorator on OptionalNodeCorner replaces the validation Notify', async () => {
    const { registerComponentDecorator, WorkflowNodeTemplate } = await load();
    registerComponentDecorator<SlotProps>('OptionalNodeCorner', {
      place: 'wrapper',
      name: 'run-badge',
      content: ({ props }: WorkflowBuilderDecoratorWrapperProps<SlotProps>) => (
        <span data-testid="run-badge" data-node-id={props.nodeId} />
      ),
    });

    render(<WorkflowNodeTemplate {...nodeProps} isValid={false} />);

    expect(screen.queryByTestId('notify')).toBeNull();
    expect(screen.getByTestId('run-badge').dataset.nodeId).toBe('node-1');
  });

  it('before and after decorators on OptionalNodeCorner keep the Notify', async () => {
    const { registerComponentDecorator, WorkflowNodeTemplate } = await load();
    registerComponentDecorator('OptionalNodeCorner', {
      place: 'before',
      name: 'corner-before',
      content: () => <span data-testid="corner-before" />,
    });
    registerComponentDecorator('OptionalNodeCorner', {
      place: 'after',
      name: 'corner-after',
      content: () => <span data-testid="corner-after" />,
    });

    render(<WorkflowNodeTemplate {...nodeProps} isValid={false} />);

    expect(screen.getByTestId('notify')).toBeTruthy();
    expect(screen.getByTestId('corner-before')).toBeTruthy();
    expect(screen.getByTestId('corner-after')).toBeTruthy();
  });

  it('OptionalNodeHeaderEnd renders as the last header child, after the collapse button', async () => {
    const { registerComponentDecorator, WorkflowNodeTemplate } = await load();
    registerComponentDecorator('OptionalNodeHeaderEnd', {
      name: 'indicator',
      content: () => <span data-testid="header-end" />,
    });

    render(
      <WorkflowNodeTemplate {...nodeProps}>
        <p>Body</p>
      </WorkflowNodeTemplate>,
    );

    const headerEnd = screen.getByTestId('header-end');
    expect(headerEnd.parentElement?.lastElementChild).toBe(headerEnd);
    expect(headerEnd.previousElementSibling?.tagName).toBe('BUTTON');
  });

  it.each(['WorkflowNodeTemplate', 'StartNodeTemplate', 'DecisionNodeTemplate', 'AiAgentNodeTemplate'])(
    '%s renders the Notify and run status slots on the canvas only',
    async (name) => {
      const { registerComponentDecorator, templates } = await load();
      const slots = ['OptionalNodeOverlay', 'OptionalNodeCorner', 'OptionalNodeHeaderEnd'];
      for (const slot of slots) {
        registerComponentDecorator(slot, { name: slot, content: () => <span data-testid={slot} /> });
      }
      const Template = templates[name]!;

      const canvas = render(<Template {...nodeProps} isValid={false} />);
      for (const testId of ['notify', ...slots]) expect(screen.getByTestId(testId)).toBeTruthy();
      canvas.unmount();

      render(<Template {...nodeProps} isValid={false} showHandles={false} />);
      for (const testId of ['notify', ...slots]) expect(screen.queryByTestId(testId)).toBeNull();
    },
  );
});
