import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import '../../../i18n/index';
import { DecisionNodeTemplate } from './decision-node-template';

vi.mock('@xyflow/react', () => ({
  Handle: () => null,
  Position: { Left: 'left', Right: 'right', Top: 'top', Bottom: 'bottom' },
}));

describe('DecisionNodeTemplate', () => {
  it.each([true, false])('disables Add branch when isAddDisabled is %s', (isAddDisabled) => {
    render(
      <DecisionNodeTemplate
        id="decision"
        icon="ArrowsSplit"
        label="Decision"
        description=""
        showHandles
        isAddDisabled={isAddDisabled}
      />,
    );

    expect((screen.getByRole('button', { name: 'Add branch' }) as HTMLButtonElement).disabled).toBe(isAddDisabled);
  });
});
