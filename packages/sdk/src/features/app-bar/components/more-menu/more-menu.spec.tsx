import { act, fireEvent, render, screen } from '@testing-library/react';
import type { MenuItemProps } from '@workflowbuilder/ui';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@workflowbuilder/ui', () => ({
  Menu: Object.assign(
    ({ items, children, footer }: { items: MenuItemProps[]; children?: ReactNode; footer?: ReactNode }) => (
      <div>
        {children}
        {items.map((item, index) =>
          item.type === 'separator' ? (
            <hr key={index} />
          ) : (
            <button
              key={item.label}
              role={item.selected === undefined ? 'menuitem' : 'menuitemradio'}
              aria-checked={item.selected}
              disabled={item.disabled}
              onClick={item.onClick}
            >
              {item.label}
            </button>
          ),
        )}
        <div data-testid="footer">{footer}</div>
      </div>
    ),
    {
      TriggerButton: ({ 'aria-label': ariaLabel, tooltip }: { 'aria-label'?: string; tooltip?: string }) => (
        <button aria-label={ariaLabel} data-tooltip={tooltip} />
      ),
    },
  ),
  SegmentPicker: Object.assign(
    ({ children, value, onChange }: { children: ReactNode; value: string; onChange: () => void }) => (
      <div role="group" data-value={value} onClick={onChange}>
        {children}
      </div>
    ),
    {
      Item: ({ 'aria-label': ariaLabel, value }: { 'aria-label'?: string; value: string }) => (
        <button aria-label={ariaLabel} data-segment={value} />
      ),
    },
  ),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const themeState = { theme: 'light' as 'light' | 'dark', toggleTheme: vi.fn() };
vi.mock('../../../../hooks/use-theme', () => ({
  useTheme: () => themeState,
}));

const state = {
  layoutDirection: 'RIGHT' as 'RIGHT' | 'DOWN',
  setLayoutDirection: vi.fn(),
  nodes: [{ id: 'a' }],
  isReadOnly: false,
};
vi.mock('../../../../store/store', () => ({
  useStore: <T,>(selector: (s: typeof state) => T) => selector(state),
}));

const trackFutureChange = vi.fn();
vi.mock('../../../changes-tracker/stores/use-changes-tracker-store', () => ({
  trackFutureChange,
}));

let appBar: { onCleanUp?: (direction: 'RIGHT' | 'DOWN') => void | Promise<void> } = {};
vi.mock('../../app-bar-context', () => ({
  useAppBar: () => appBar,
}));

const { MoreMenu } = await import('./more-menu');
const { BuiltInControlsProvider } = await import('../../../ui-extensions/built-in-controls-context');

const item = (label: string) => screen.getByText(label) as HTMLButtonElement;
const itemLabels = () => Array.from(document.querySelectorAll('[role^="menuitem"]'), (element) => element.textContent);

const CLEAN_UP = 'header.cleanUp.diagram';
const HORIZONTAL = 'header.cleanUp.arrangeHorizontally';
const VERTICAL = 'header.cleanUp.arrangeVertically';

describe('MoreMenu', () => {
  beforeEach(() => {
    appBar = {};
    themeState.theme = 'light';
    themeState.toggleTheme = vi.fn();
    state.layoutDirection = 'RIGHT';
    state.setLayoutDirection = vi.fn();
    state.nodes = [{ id: 'a' }];
    state.isReadOnly = false;
    trackFutureChange.mockClear();
  });

  it('uses the shared ⋮ trigger labelled with tooltips.menu', () => {
    render(<MoreMenu />);

    expect(screen.getByRole('button', { name: 'tooltips.menu' }).dataset.tooltip).toBe('tooltips.menu');
  });

  it('lists the theme as menu items with the current one checked when onCleanUp is not set', () => {
    themeState.theme = 'dark';
    render(<MoreMenu />);

    expect(itemLabels()).toEqual(['header.theme.light', 'header.theme.dark']);
    expect(item('header.theme.light').getAttribute('aria-checked')).toBe('false');
    expect(item('header.theme.dark').getAttribute('aria-checked')).toBe('true');
    expect(screen.queryByRole('group')).toBeNull();
  });

  it('switches the theme from a menu item only when it changes', () => {
    render(<MoreMenu />);
    fireEvent.click(item('header.theme.light'));
    fireEvent.click(item('header.theme.dark'));

    expect(themeState.toggleTheme).toHaveBeenCalledTimes(1);
  });

  it('lists Clean up diagram and the arrange items when onCleanUp is set', () => {
    appBar = { onCleanUp: vi.fn() };
    render(<MoreMenu />);

    expect(itemLabels()).toEqual([CLEAN_UP, HORIZONTAL, VERTICAL]);
    expect(screen.queryByText('English')).toBeNull();
  });

  it('renders Clean up diagram as a plain item and checks the current direction', () => {
    appBar = { onCleanUp: vi.fn() };
    state.layoutDirection = 'DOWN';
    render(<MoreMenu />);

    expect(item(CLEAN_UP).getAttribute('role')).toBe('menuitem');
    expect(item(HORIZONTAL).getAttribute('aria-checked')).toBe('false');
    expect(item(VERTICAL).getAttribute('aria-checked')).toBe('true');
  });

  it('runs clean-up in the current direction', () => {
    const onCleanUp = vi.fn();
    appBar = { onCleanUp };
    render(<MoreMenu />);
    fireEvent.click(item(CLEAN_UP));

    expect(onCleanUp).toHaveBeenCalledWith('RIGHT');
    expect(state.setLayoutDirection).not.toHaveBeenCalled();
  });

  it('arranges in the chosen direction like the split button', () => {
    const onCleanUp = vi.fn();
    appBar = { onCleanUp };
    render(<MoreMenu />);
    fireEvent.click(item(VERTICAL));

    expect(trackFutureChange).toHaveBeenCalledWith('layoutDirection', { direction: 'DOWN' });
    expect(state.setLayoutDirection).toHaveBeenCalledWith('DOWN');
    expect(onCleanUp).toHaveBeenCalledWith('DOWN');
  });

  it('disables the clean-up items on an empty canvas or in read-only mode', () => {
    appBar = { onCleanUp: vi.fn() };
    state.isReadOnly = true;
    render(<MoreMenu />);

    expect([item(CLEAN_UP), item(HORIZONTAL), item(VERTICAL)].every((button) => button.disabled)).toBe(true);
  });

  it('disables the clean-up items while an async clean-up is pending and re-enables them after it settles', async () => {
    let settle: (() => void) | undefined;
    const onCleanUp = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          settle = resolve;
        }),
    );
    appBar = { onCleanUp };
    render(<MoreMenu />);
    const cleanUpItems = () => [item(CLEAN_UP), item(HORIZONTAL), item(VERTICAL)];

    fireEvent.click(item(CLEAN_UP));
    expect(cleanUpItems().every((button) => button.disabled)).toBe(true);

    await act(async () => settle?.());
    expect(cleanUpItems().some((button) => button.disabled)).toBe(false);
    expect(onCleanUp).toHaveBeenCalledTimes(1);
  });

  it('toggles the theme from the footer picker when onCleanUp is set', () => {
    appBar = { onCleanUp: vi.fn() };
    render(<MoreMenu />);
    fireEvent.click(screen.getByRole('group'));

    expect(themeState.toggleTheme).toHaveBeenCalledTimes(1);
  });

  it('renders nothing when themeToggle is hidden and onCleanUp is not set', () => {
    const { container } = render(
      <BuiltInControlsProvider value={{ themeToggle: false }}>
        <MoreMenu />
      </BuiltInControlsProvider>,
    );

    expect(container.innerHTML).toBe('');
  });

  it('drops the separator and the footer picker when themeToggle is hidden', () => {
    appBar = { onCleanUp: vi.fn() };
    render(
      <BuiltInControlsProvider value={{ themeToggle: false }}>
        <MoreMenu />
      </BuiltInControlsProvider>,
    );

    expect(itemLabels()).toEqual([CLEAN_UP, HORIZONTAL, VERTICAL]);
    expect(document.querySelector('hr')).toBeNull();
    expect(screen.queryByRole('group')).toBeNull();
  });
});
