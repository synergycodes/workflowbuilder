import { fireEvent, render, screen } from '@testing-library/react';
import type { MenuItemProps } from '@workflowbuilder/ui';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Render the menu's `items` inline so we can assert on them without driving the
// real menu popover. The component also renders Input and Menu.TriggerButton, so
// the mock must expose them too.
vi.mock('@workflowbuilder/ui', () => ({
  Menu: Object.assign(
    ({ items }: { items: MenuItemProps[] }) => (
      <ul>
        {items.map((item, index) => (
          <li key={item.label ?? index}>
            {item.type === 'separator' ? '---' : <button onClick={item.onClick}>{item.label}</button>}
          </li>
        ))}
      </ul>
    ),
    { TriggerButton: () => null },
  ),
  NavButton: () => null,
  Input: () => <input aria-label="rename" />,
  Tooltip: Object.assign(({ children }: { children?: ReactNode }) => <>{children}</>, {
    Trigger: ({ children }: { children?: ReactNode }) => <>{children}</>,
    Content: ({ children }: { children?: ReactNode }) => (children ? <div role="tooltip">{children}</div> : null),
  }),
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

vi.mock('../../functions/get-controls-dots-items', () => ({
  getControlsDotsItems: vi.fn(() => [{ label: 'importExport.export' }, { label: 'importExport.import' }]),
}));

vi.mock('../version-chip/version-chip', () => ({
  VersionChip: () => null,
}));

let appBar: { onSaveAsPdf?: () => void } = {};
vi.mock('../../app-bar-context', () => ({
  useAppBar: () => appBar,
}));

const { ProjectSelection } = await import('./project-selection');
const { getControlsDotsItems } = await import('../../functions/get-controls-dots-items');

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

const labels = () => screen.getAllByRole('listitem').map((li) => li.textContent);

describe('ProjectSelection — menu layout', () => {
  it('lists Export, Import, a separator, then Settings', () => {
    render(<ProjectSelection />);

    expect(labels()).toEqual(['importExport.export', 'importExport.import', '---', SETTINGS_LABEL]);
  });

  it('appends Duplicate to Drafts last when onDuplicateClick is set', () => {
    render(<ProjectSelection onDuplicateClick={vi.fn()} />);

    expect(labels().at(-1)).toBe(DUPLICATE_LABEL);
  });

  it('drops the separator when getControlsDotsItems returns nothing', () => {
    vi.mocked(getControlsDotsItems).mockReturnValueOnce([]);
    render(<ProjectSelection />);

    expect(labels()).toEqual([SETTINGS_LABEL]);
  });
});

describe('ProjectSelection — Save as PDF', () => {
  const PDF_LABEL = 'header.projectSelection.saveAsPdf';

  beforeEach(() => {
    appBar = {};
  });

  it('adds Save as PDF after Import when onSaveAsPdf is set', () => {
    const onSaveAsPdf = vi.fn();
    appBar = { onSaveAsPdf };
    render(<ProjectSelection />);

    expect(labels()).toEqual(['importExport.export', 'importExport.import', PDF_LABEL, '---', SETTINGS_LABEL]);

    fireEvent.click(screen.getByText(PDF_LABEL));
    expect(onSaveAsPdf).toHaveBeenCalledTimes(1);
  });

  it('omits Save as PDF without a handler', () => {
    render(<ProjectSelection />);

    expect(screen.queryByText(PDF_LABEL)).toBeNull();
  });

  it('keeps the separator when only Save as PDF precedes it', () => {
    appBar = { onSaveAsPdf: vi.fn() };
    vi.mocked(getControlsDotsItems).mockReturnValueOnce([]);
    render(<ProjectSelection />);

    expect(labels()).toEqual([PDF_LABEL, '---', SETTINGS_LABEL]);
  });
});

const hoverTitle = (scrollWidth: number, clientWidth: number) => {
  const title = screen.getByText('Doc');
  Object.defineProperty(title, 'scrollWidth', { configurable: true, value: scrollWidth });
  Object.defineProperty(title, 'clientWidth', { configurable: true, value: clientWidth });
  fireEvent.mouseEnter(title);
  return title;
};

describe('ProjectSelection — truncated name tooltip', () => {
  it('shows the full name when the title is ellipsised', () => {
    render(<ProjectSelection />);
    hoverTitle(400, 320);

    expect(screen.getByRole('tooltip').textContent).toBe('Doc');
  });

  it('shows no tooltip when the name fits', () => {
    render(<ProjectSelection />);
    hoverTitle(120, 120);

    expect(screen.queryByRole('tooltip')).toBeNull();
  });

  it('still switches to the rename input on click', () => {
    render(<ProjectSelection />);
    fireEvent.click(hoverTitle(400, 320));

    expect(screen.getByRole('textbox', { name: 'rename' })).toBeDefined();
  });
});
