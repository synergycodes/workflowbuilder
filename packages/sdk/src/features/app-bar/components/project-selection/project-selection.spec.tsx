import type { MenuItemProps } from '@synergycodes/overflow-ui';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

// Render the menu's `items` inline so we can assert on them without driving the
// real overflow-ui popover. The component also imports Input/NavButton, so the
// mock must expose them too.
vi.mock('@synergycodes/overflow-ui', () => ({
  Menu: ({ items }: { items: MenuItemProps[] }) => (
    <ul>
      {items.map((item) => (
        <li key={item.label}>
          <button onClick={item.onClick}>{item.label}</button>
        </li>
      ))}
    </ul>
  ),
  NavButton: () => null,
  Input: () => null,
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
  useStore: <T,>(
    selector: (state: { documentName: string; isReadOnlyMode: boolean; setDocumentName: () => void }) => T,
  ) => selector({ documentName: 'Doc', isReadOnlyMode: false, setDocumentName: () => {} }),
}));

const { ProjectSelection } = await import('./project-selection');

const DUPLICATE_LABEL = 'header.projectSelection.duplicateToDrafts';
const SETTINGS_LABEL = 'common.settings';

describe('ProjectSelection — "Duplicate to Drafts" visibility', () => {
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
