import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('./branch-card/branch-card', () => ({
  BranchCard: () => <div data-testid="branch-card" />,
}));

vi.mock('../../../diagram/nodes/components/placeholder-button/placeholder-button', () => ({
  PlaceholderButton: () => <button type="button">add</button>,
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

// Unwrap withJsonFormsControlProps so props flow directly instead of from JSONForms context.
vi.mock('../../utils/rendering', () => ({
  createControlRenderer: (_type: string, renderer: unknown) => ({ tester: undefined, renderer }),
}));

const { decisionBranchesControlRenderer } = await import('./decision-branches-control');

const branch = (id: string) => ({ id, sourceHandle: `source:inner:${id}`, label: id, conditions: [] });

describe('DecisionBranchesControl', () => {
  it('stacks branch cards in a styled container (regression: unstyled div rendered them glued)', () => {
    const Control = decisionBranchesControlRenderer.renderer as unknown as React.ComponentType<Record<string, unknown>>;
    const { container, getAllByTestId } = render(
      <Control
        data={[branch('a'), branch('b')]}
        handleChange={() => {}}
        path="decisionBranches"
        enabled={true}
        errors=""
        uischema={{ type: 'DecisionBranches', scope: '#/properties/decisionBranches' }}
      />,
    );

    const wrapper = getAllByTestId('branch-card')[0].parentElement;
    expect(wrapper?.className).toContain('branches');
    expect(container.querySelectorAll('[data-testid="branch-card"]')).toHaveLength(2);
  });
});
