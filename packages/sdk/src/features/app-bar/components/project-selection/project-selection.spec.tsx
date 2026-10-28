import { fireEvent, render, screen } from '@testing-library/react';
import type { MenuItemProps } from '@workflowbuilder/ui';
import { describe, expect, it, vi } from 'vitest';

import { BuiltInControlsProvider } from '../../../ui-extensions/built-in-controls-context';

// Render the menu's `items` inline so we can assert on them without driving the
// real menu popover. The component also renders Input and Menu.TriggerButton, so
// the mock must expose them too.
vi.mock('@workflowbuilder/ui', () => ({
  Menu: Object.assign(
    ({ items }: { items: MenuItemProps[] }) => (
      <ul>
        {items.map((item) => (
          <li key={item.label}>
            <button onClick={item.onClick}>{item.label}</button>
          </li>
        ))}
      </ul>
    ),
    { TriggerButton: () => null },
  ),
  Input: ({ value, onChange }: { value: string; onChange: (event: { target: { value: string } }) => void }) => (
    <input
      aria-label="document name"
      value={value}
      onChange={(event) => onChange({ target: { value: event.target.value } })}
    />
  ),
}));

vi.mock('@workflow-builder/icons', () => ({
  Icon: () => null,
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('../../../../features/variables/modals/modal-settings', () => ({
  openModalWorkflowSettings: vi.fn(),
}));

vi.mock('../../../../store/store', () => ({
  useStore: <T,>(selector: (state: { workflowName: string; isReadOnly: boolean }) => T) =>
    selector({ workflowName: 'Doc', isReadOnly: false }),
}));

const setWorkflowName = vi.fn();
vi.mock('../../../../hooks/use-workflow-builder-actions', () => ({
  useWorkflowBuilderActions: () => ({ setWorkflowName }),
}));

const { ProjectSelection } = await import('./project-selection');

const SETTINGS_LABEL = 'common.settings';

describe('ProjectSelection: menu', () => {
  it('shows Settings as the only built-in item', () => {
    render(<ProjectSelection />);

    expect(screen.getByText(SETTINGS_LABEL)).toBeDefined();
    expect(screen.getAllByRole('button')).toHaveLength(1);
  });
});

describe('ProjectSelection: inline rename', () => {
  it('typing a new name calls the setWorkflowName action, not the store setter directly', () => {
    render(<ProjectSelection />);

    fireEvent.click(screen.getByText('Doc'));
    fireEvent.change(screen.getByLabelText('document name'), { target: { value: 'New Name' } });

    expect(setWorkflowName).toHaveBeenCalledWith('New Name');
  });

  it('an open rename input closes when workflowRename is hidden', () => {
    const { rerender } = render(
      <BuiltInControlsProvider value={{}}>
        <ProjectSelection />
      </BuiltInControlsProvider>,
    );

    fireEvent.click(screen.getByText('Doc'));
    expect(screen.getByLabelText('document name')).toBeDefined();

    rerender(
      <BuiltInControlsProvider value={{ workflowRename: false }}>
        <ProjectSelection />
      </BuiltInControlsProvider>,
    );

    expect(screen.queryByLabelText('document name')).toBeNull();
    expect(screen.getByText('Doc')).toBeDefined();
  });
});
