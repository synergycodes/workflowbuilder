import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

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
  it('uses the ai accent when the definition sets none', () => {
    render(<AiAgentNodeTemplate id="agent" icon="Robot" label="Agent" description="" />);

    expect(screen.getByTestId('node-icon').dataset.accent).toBe('ai');
  });

  it('an explicit accent overrides the ai default', () => {
    render(<AiAgentNodeTemplate id="agent" icon="Robot" label="Agent" description="" accent="green" />);

    expect(screen.getByTestId('node-icon').dataset.accent).toBe('green');
  });
});
