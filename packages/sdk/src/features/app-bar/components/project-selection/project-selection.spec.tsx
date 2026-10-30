import { fireEvent, render, screen } from '@testing-library/react';
import type { MenuItemProps } from '@workflowbuilder/ui';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { BuiltInControlsProvider } from '../../../ui-extensions/built-in-controls-context';

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
  Input: ({ value, onChange }: { value: string; onChange: (event: { target: { value: string } }) => void }) => (
    <input
      aria-label="workflow name"
      value={value}
      onChange={(event) => onChange({ target: { value: event.target.value } })}
    />
  ),
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

vi.mock('../../../../features/variables/modals/global/modal-settings', () => ({
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

vi.mock('../../functions/get-export-import-items', () => ({
  getExportImportItems: (visible: { export: boolean; import: boolean }) => [
    ...(visible.export ? [{ label: 'importExport.export' }] : []),
    ...(visible.import ? [{ label: 'importExport.import' }] : []),
  ],
}));

vi.mock('../version-chip/version-chip', () => ({
  VersionChip: () => null,
}));

let appBar: { onSaveAsPdf?: () => void } = {};
vi.mock('../../app-bar-context', () => ({
  useAppBar: () => appBar,
}));

const { ProjectSelection } = await import('./project-selection');

const SETTINGS_LABEL = 'common.settings';
const PDF_LABEL = 'header.projectSelection.saveAsPdf';

const labels = () => screen.getAllByRole('listitem').map((li) => li.textContent);

beforeEach(() => {
  appBar = {};
});

describe('ProjectSelection: menu', () => {
  it('lists Export, Import, a separator, then Settings', () => {
    render(<ProjectSelection />);

    expect(labels()).toEqual(['importExport.export', 'importExport.import', '---', SETTINGS_LABEL]);
  });

  it('drops Export and Import, and the separator, when builtInControls hides them', () => {
    render(
      <BuiltInControlsProvider value={{ export: false, import: false }}>
        <ProjectSelection />
      </BuiltInControlsProvider>,
    );

    expect(labels()).toEqual([SETTINGS_LABEL]);
  });

  it('drops the separator when Settings is hidden', () => {
    render(
      <BuiltInControlsProvider value={{ settings: false }}>
        <ProjectSelection />
      </BuiltInControlsProvider>,
    );

    expect(labels()).toEqual(['importExport.export', 'importExport.import']);
  });

  it('renders no menu when every built-in item is hidden', () => {
    render(
      <BuiltInControlsProvider value={{ export: false, import: false, settings: false }}>
        <ProjectSelection />
      </BuiltInControlsProvider>,
    );

    expect(screen.queryByRole('list')).toBeNull();
  });
});

describe('ProjectSelection: Save as PDF', () => {
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
    render(
      <BuiltInControlsProvider value={{ export: false, import: false }}>
        <ProjectSelection />
      </BuiltInControlsProvider>,
    );

    expect(labels()).toEqual([PDF_LABEL, '---', SETTINGS_LABEL]);
  });
});

describe('ProjectSelection: inline rename', () => {
  it('typing a new name calls the setWorkflowName action, not the store setter directly', () => {
    render(<ProjectSelection />);

    fireEvent.click(screen.getByText('Doc'));
    fireEvent.change(screen.getByLabelText('workflow name'), { target: { value: 'New Name' } });

    expect(setWorkflowName).toHaveBeenCalledWith('New Name');
  });

  it('an open rename input closes when workflowRename is hidden', () => {
    const { rerender } = render(
      <BuiltInControlsProvider value={{}}>
        <ProjectSelection />
      </BuiltInControlsProvider>,
    );

    fireEvent.click(screen.getByText('Doc'));
    expect(screen.getByLabelText('workflow name')).toBeDefined();

    rerender(
      <BuiltInControlsProvider value={{ workflowRename: false }}>
        <ProjectSelection />
      </BuiltInControlsProvider>,
    );

    expect(screen.queryByLabelText('workflow name')).toBeNull();
    expect(screen.getByText('Doc')).toBeDefined();
  });
});

const hoverTitle = (scrollWidth: number, clientWidth: number) => {
  const title = screen.getByText('Doc');
  Object.defineProperty(title, 'scrollWidth', { configurable: true, value: scrollWidth });
  Object.defineProperty(title, 'clientWidth', { configurable: true, value: clientWidth });
  fireEvent.mouseEnter(title);
  return title;
};

describe('ProjectSelection: truncated name tooltip', () => {
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

    expect(screen.getByRole('textbox', { name: 'workflow name' })).toBeDefined();
  });
});
