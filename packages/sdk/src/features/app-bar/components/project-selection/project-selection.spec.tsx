import { fireEvent, render, screen } from '@testing-library/react';
import type { MenuItemProps } from '@workflowbuilder/ui';
import { describe, expect, it, vi } from 'vitest';

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
  useStore: <T,>(selector: (state: { documentName: string; isReadOnly: boolean }) => T) =>
    selector({ documentName: 'Doc', isReadOnly: false }),
}));

const renameDocument = vi.fn();
vi.mock('../../../../hooks/use-workflow-builder-actions', () => ({
  useWorkflowBuilderActions: () => ({ renameDocument }),
}));

const { ProjectSelection } = await import('./project-selection');

const DUPLICATE_LABEL = 'header.projectSelection.duplicateToDrafts';
const SETTINGS_LABEL = 'common.settings';

describe('ProjectSelection: "Duplicate to Drafts" visibility', () => {
  it('omits the item when no onDuplicateClick is provided (default editor)', () => {
    render(<ProjectSelection />);

    expect(screen.getByText(SETTINGS_LABEL)).toBeDefined();
    expect(screen.queryByText(DUPLICATE_LABEL)).toBeNull();
  });

  it('renders the item and wires the handler when onDuplicateClick is provided', () => {
    const onDuplicateClick = vi.fn();
    render(<ProjectSelection onDuplicateClick={onDuplicateClick} />);

    const item = screen.getByText(DUPLICATE_LABEL);
    expect(item).toBeDefined();

    fireEvent.click(item);
    expect(onDuplicateClick).toHaveBeenCalledTimes(1);
  });
});

describe('ProjectSelection: inline rename', () => {
  it('typing a new name calls the renameDocument action, not setDocumentName directly', () => {
    render(<ProjectSelection />);

    fireEvent.click(screen.getByText('Doc'));
    fireEvent.change(screen.getByLabelText('document name'), { target: { value: 'New Name' } });

    expect(renameDocument).toHaveBeenCalledWith('New Name');
  });
});
