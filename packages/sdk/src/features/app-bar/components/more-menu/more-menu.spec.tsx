import { fireEvent, render, screen } from '@testing-library/react';
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

const themeState = { theme: 'light' as 'light' | 'dark' };
vi.mock('../../../../hooks/use-theme', () => ({
  useTheme: () => themeState,
}));

const actions = { setTheme: vi.fn() };
vi.mock('../../../../hooks/use-workflow-builder-actions', () => ({
  useWorkflowBuilderActions: () => actions,
}));

const cleanUpState = {
  isAvailable: false,
  layoutDirection: 'RIGHT' as 'RIGHT' | 'DOWN',
  isPending: false,
  isDisabled: false,
  cleanUp: vi.fn(),
};
vi.mock('../clean-up-button/use-clean-up', () => ({
  useCleanUp: () => cleanUpState,
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
    themeState.theme = 'light';
    actions.setTheme = vi.fn();
    Object.assign(cleanUpState, {
      isAvailable: false,
      layoutDirection: 'RIGHT',
      isPending: false,
      isDisabled: false,
      cleanUp: vi.fn(),
    });
  });

  it('uses the shared ⋮ trigger labelled with tooltips.menu', () => {
    render(<MoreMenu />);

    expect(screen.getByRole('button', { name: 'tooltips.menu' }).dataset.tooltip).toBe('tooltips.menu');
  });

  it('lists the theme as menu items with the current one checked when Clean up is not available', () => {
    themeState.theme = 'dark';
    render(<MoreMenu />);

    expect(itemLabels()).toEqual(['header.theme.light', 'header.theme.dark']);
    expect(item('header.theme.light').getAttribute('aria-checked')).toBe('false');
    expect(item('header.theme.dark').getAttribute('aria-checked')).toBe('true');
    expect(screen.queryByRole('group')).toBeNull();
  });

  it('sets the picked theme through the action', () => {
    render(<MoreMenu />);
    fireEvent.click(item('header.theme.light'));
    fireEvent.click(item('header.theme.dark'));

    expect(actions.setTheme.mock.calls).toEqual([['light'], ['dark']]);
  });

  it('lists Clean up diagram and the arrange items when Clean up is available', () => {
    cleanUpState.isAvailable = true;
    render(<MoreMenu />);

    expect(itemLabels()).toEqual([CLEAN_UP, HORIZONTAL, VERTICAL]);
    expect(screen.queryByText('English')).toBeNull();
  });

  it('renders Clean up diagram as a plain item and checks the current direction', () => {
    cleanUpState.isAvailable = true;
    cleanUpState.layoutDirection = 'DOWN';
    render(<MoreMenu />);

    expect(item(CLEAN_UP).getAttribute('role')).toBe('menuitem');
    expect(item(HORIZONTAL).getAttribute('aria-checked')).toBe('false');
    expect(item(VERTICAL).getAttribute('aria-checked')).toBe('true');
  });

  it('Clean up diagram cleans up in the current direction', () => {
    cleanUpState.isAvailable = true;
    render(<MoreMenu />);
    fireEvent.click(item(CLEAN_UP));

    expect(cleanUpState.cleanUp).toHaveBeenCalledExactlyOnceWith();
  });

  it('an arrange item cleans up in its direction', () => {
    cleanUpState.isAvailable = true;
    render(<MoreMenu />);
    fireEvent.click(item(VERTICAL));

    expect(cleanUpState.cleanUp).toHaveBeenCalledExactlyOnceWith('DOWN');
  });

  it.each([
    ['disabled', { isDisabled: true }],
    ['pending', { isPending: true }],
  ])('disables the clean-up items while Clean up is %s', (_, change) => {
    Object.assign(cleanUpState, { isAvailable: true, ...change });
    render(<MoreMenu />);

    expect([item(CLEAN_UP), item(HORIZONTAL), item(VERTICAL)].every((button) => button.disabled)).toBe(true);
  });

  it('sets the theme from the footer picker through the action when Clean up is available', () => {
    cleanUpState.isAvailable = true;
    render(<MoreMenu />);
    fireEvent.click(screen.getByRole('group'));

    expect(actions.setTheme).toHaveBeenCalledOnce();
  });

  it('renders nothing when themeToggle is hidden and Clean up is not available', () => {
    const { container } = render(
      <BuiltInControlsProvider value={{ themeToggle: false }}>
        <MoreMenu />
      </BuiltInControlsProvider>,
    );

    expect(container.innerHTML).toBe('');
  });

  it('drops the separator and the footer picker when themeToggle is hidden', () => {
    cleanUpState.isAvailable = true;
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
