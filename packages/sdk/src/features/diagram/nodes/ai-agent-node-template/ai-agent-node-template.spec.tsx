import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import '../../../i18n/index';
import { AiAgentNodeTemplate } from './ai-agent-node-template';

vi.mock('@workflowbuilder/ui', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  NodeIcon: ({ accent }: { accent?: string }) => <span data-testid="node-icon" data-accent={accent} />,
}));

vi.mock('@xyflow/react', () => ({
  Handle: () => null,
  Position: { Left: 'left', Right: 'right', Top: 'top', Bottom: 'bottom' },
}));

describe('AiAgentNodeTemplate', () => {
  it('uses the violet-gradient accent when the definition sets none', () => {
    render(<AiAgentNodeTemplate id="agent" icon="Robot" label="Agent" description="" />);

    expect(screen.getByTestId('node-icon').dataset.accent).toBe('violet-gradient');
  });

  it('an explicit accent overrides the violet-gradient default', () => {
    render(<AiAgentNodeTemplate id="agent" icon="Robot" label="Agent" description="" accent="green" />);

    expect(screen.getByTestId('node-icon').dataset.accent).toBe('green');
  });

  it.each([true, false])('disables Add Tool when isAddDisabled is %s', (isAddDisabled) => {
    render(<AiAgentNodeTemplate id="agent" icon="Robot" label="Agent" description="" isAddDisabled={isAddDisabled} />);

    expect((screen.getByRole('button', { name: 'Add Tool' }) as HTMLButtonElement).disabled).toBe(isAddDisabled);
  });
});
