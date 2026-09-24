import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ConnectableItem } from './connectable-item';

vi.mock('@xyflow/react', () => ({
  Handle: ({ id }: { id: string }) => <span data-testid="handle" data-handle-id={id} />,
  Position: { Right: 'right', Bottom: 'bottom' },
}));

vi.mock('../../../../../store/store', () => ({
  useStore: (selector: (state: { layoutDirection: 'RIGHT' | 'DOWN' }) => unknown) =>
    selector({ layoutDirection: 'RIGHT' }),
}));

describe('ConnectableItem', () => {
  it('exposes the full label as a tooltip so a clipped row stays readable', () => {
    const label = 'Small and medium business with an unusually long branch label';

    render(<ConnectableItem handleId="source:inner:b2" label={label} />);

    expect(screen.getByText(label).getAttribute('title')).toBe(label);
    expect(screen.getByTestId('handle').dataset.handleId).toBe('source:inner:b2');
  });
});
