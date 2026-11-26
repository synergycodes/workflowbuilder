import { render, screen } from '@testing-library/react';
import type { ComponentType, ReactNode } from 'react';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import type { WorkflowBuilderDecoratorWrapperProps } from '../../plugins-core/adapters/adapter-components';

vi.mock('@workflowbuilder/ui', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  Status: ({ tone }: { tone?: string }) => (tone ? <span data-testid="status" /> : null),
}));

vi.mock('@xyflow/react', () => ({
  Handle: ({ type }: { type: string }) => <div data-handle={type} />,
  Position: { Left: 'left', Right: 'right', Top: 'top', Bottom: 'bottom' },
}));

type SlotProps = { nodeId: string };

const nodeProps = { id: 'node-1', icon: 'Play', label: 'Send email', description: '' } as const;
const handleParents = (root: HTMLElement) =>
  Array.from(root.querySelectorAll('[data-handle]'), (handle) => handle.parentElement!);

type TemplateProps = typeof nodeProps & { isValid?: boolean; showHandles?: boolean; children?: ReactNode };

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

  it('a wrapper decorator on OptionalNodeCorner replaces the validation Status', async () => {
    const { registerComponentDecorator, WorkflowNodeTemplate } = await load();
    registerComponentDecorator<SlotProps>('OptionalNodeCorner', {
      place: 'wrapper',
      name: 'run-badge',
      content: ({ props }: WorkflowBuilderDecoratorWrapperProps<SlotProps>) => (
        <span data-testid="run-badge" data-node-id={props.nodeId} />
      ),
    });

    render(<WorkflowNodeTemplate {...nodeProps} isValid={false} />);

    expect(screen.queryByTestId('status')).toBeNull();
    expect(screen.getByTestId('run-badge').dataset.nodeId).toBe('node-1');
  });

  it('before and after decorators on OptionalNodeCorner keep the Status', async () => {
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

    expect(screen.getByTestId('status')).toBeTruthy();
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
    '%s renders the Status and run status slots on the canvas only',
    async (name) => {
      const { registerComponentDecorator, templates } = await load();
      const slots = ['OptionalNodeOverlay', 'OptionalNodeCorner', 'OptionalNodeHeaderEnd', 'OptionalNodeFooter'];
      for (const slot of slots) {
        registerComponentDecorator(slot, { name: slot, content: () => <span data-testid={slot} /> });
      }
      const Template = templates[name]!;

      const canvas = render(<Template {...nodeProps} isValid={false} showHandles />);
      for (const testId of ['status', ...slots]) expect(screen.getByTestId(testId)).toBeTruthy();
      for (const testId of ['status', 'OptionalNodeOverlay', 'OptionalNodeCorner']) {
        expect(screen.getByTestId(testId).closest('[class*="overlay"]')).not.toBeNull();
      }
      for (const testId of ['OptionalNodeHeaderEnd', 'OptionalNodeFooter']) {
        expect(screen.getByTestId(testId).closest('[class*="overlay"]')).toBeNull();
      }
      expect(screen.getByTestId('OptionalNodeFooter').closest('[class*="content-container"]')).toBeNull();
      canvas.unmount();

      render(<Template {...nodeProps} isValid={false} showHandles={false} />);
      for (const testId of ['status', ...slots]) expect(screen.queryByTestId(testId)).toBeNull();
    },
  );

  it.each(['WorkflowNodeTemplate', 'StartNodeTemplate', 'DecisionNodeTemplate', 'AiAgentNodeTemplate'])(
    '%s renders no footer element between the content and the overlay while OptionalNodeFooter is empty',
    async (name) => {
      const { templates } = await load();
      const Template = templates[name]!;

      const { container } = render(<Template {...nodeProps} showHandles />);

      const panel = container.querySelector('[class*="overlay"]')!.parentElement!;
      expect(
        Array.from(panel.children, (child) => child.className.match(/header-wrapper|content-container|overlay/)?.[0]),
      ).toEqual(['header-wrapper', 'content-container', 'overlay']);
    },
  );

  it.each(['WorkflowNodeTemplate', 'StartNodeTemplate', 'AiAgentNodeTemplate'])(
    '%s keeps OptionalNodeFooter outside the collapsible body, so a collapsed node still shows it',
    async (name) => {
      const { registerComponentDecorator, templates } = await load();
      registerComponentDecorator('OptionalNodeFooter', {
        name: 'footer',
        content: () => <span data-testid="footer" />,
      });
      const Template = templates[name]!;

      const { container } = render(
        <Template {...nodeProps} showHandles>
          <p>Body</p>
        </Template>,
      );

      const body = container.querySelector('[class*="content-wrapper"]')!;
      expect(body.className).not.toMatch(/expanded/);
      expect(body.contains(screen.getByTestId('footer'))).toBe(false);
    },
  );

  it.each(['WorkflowNodeTemplate', 'StartNodeTemplate', 'DecisionNodeTemplate', 'AiAgentNodeTemplate'])(
    '%s keeps its ports in the header row, unchanged, when OptionalNodeFooter shows',
    async (name) => {
      const { registerComponentDecorator, templates } = await load();
      const Template = templates[name]!;

      const plain = render(<Template {...nodeProps} showHandles />);
      const parentClassesWithoutFooter = handleParents(plain.container).map((parent) => parent.className);
      plain.unmount();

      registerComponentDecorator('OptionalNodeFooter', {
        name: 'footer',
        content: () => <span data-testid="footer" />,
      });
      const { container } = render(<Template {...nodeProps} showHandles />);
      const footer = screen.getByTestId('footer');

      const parents = handleParents(container);
      expect(parents.length).toBeGreaterThan(0);
      expect(parents.map((parent) => parent.className)).toEqual(parentClassesWithoutFooter);
      for (const parent of parents) {
        expect(parent.querySelector('[class*="header-container"]')).not.toBeNull();
        expect(parent.contains(footer)).toBe(false);
      }
    },
  );
});
