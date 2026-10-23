import { act, fireEvent, render, screen } from '@testing-library/react';
import type { MenuItemProps } from '@workflowbuilder/ui';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

type ButtonMockProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  prefixIcon?: ReactNode;
  isSelected?: boolean;
  tooltip?: string;
  size?: string;
};

function ButtonMock({
  prefixIcon: _prefixIcon,
  isSelected: _isSelected,
  tooltip,
  size: _size,
  ...props
}: ButtonMockProps) {
  return <button data-tooltip={tooltip} {...props} />;
}

let menuItems: MenuItemProps[] = [];
vi.mock('@workflowbuilder/ui', () => ({
  NavButton: ButtonMock,
  Menu: Object.assign(
    ({ items, children }: { items: MenuItemProps[]; children?: ReactNode }) => {
      menuItems = items;
      return (
        <div>
          {children}
          {items.map((item) => (
            <button key={item.label} onClick={item.onClick}>
              {item.label}
            </button>
          ))}
        </div>
      );
    },
    { TriggerButton: ButtonMock },
  ),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
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

const { CleanUpButton } = await import('./clean-up-button');

const MAIN = 'header.cleanUp.horizontal';
const CARET = 'header.cleanUp.chooseDirection';
const main = () => screen.getByRole('button', { name: MAIN }) as HTMLButtonElement;
const caret = () => screen.getByRole('button', { name: CARET }) as HTMLButtonElement;

describe('CleanUpButton', () => {
  beforeEach(() => {
    state.layoutDirection = 'RIGHT';
    state.setLayoutDirection = vi.fn();
    state.nodes = [{ id: 'a' }];
    state.isReadOnly = false;
    trackFutureChange.mockClear();
    appBar = { onCleanUp: vi.fn() };
  });

  it('renders nothing without onCleanUp', () => {
    appBar = {};
    const { container } = render(<CleanUpButton />);

    expect(container.firstChild).toBeNull();
  });

  it('calls onCleanUp with the current direction on main click', () => {
    render(<CleanUpButton />);

    expect(main().dataset['tooltip']).toBe(MAIN);
    fireEvent.click(main());
    expect(appBar.onCleanUp).toHaveBeenCalledExactlyOnceWith('RIGHT');
  });

  it('switches direction from the menu, tracks it, then cleans up', () => {
    render(<CleanUpButton />);

    fireEvent.click(screen.getByText('header.cleanUp.arrangeVertically'));

    const onCleanUp = vi.mocked(appBar.onCleanUp!);
    expect(trackFutureChange).toHaveBeenCalledExactlyOnceWith('layoutDirection', { direction: 'DOWN' });
    expect(state.setLayoutDirection).toHaveBeenCalledExactlyOnceWith('DOWN');
    expect(onCleanUp).toHaveBeenCalledExactlyOnceWith('DOWN');
    expect(trackFutureChange.mock.invocationCallOrder[0]).toBeLessThan(
      state.setLayoutDirection.mock.invocationCallOrder[0],
    );
    expect(state.setLayoutDirection.mock.invocationCallOrder[0]).toBeLessThan(onCleanUp.mock.invocationCallOrder[0]);
  });

  it('marks the current direction as selected', () => {
    render(<CleanUpButton />);

    expect(menuItems.find((item) => item.label === 'header.cleanUp.arrangeHorizontally')?.selected).toBe(true);
    expect(menuItems.find((item) => item.label === 'header.cleanUp.arrangeVertically')?.selected).toBe(false);
  });

  it('is disabled on an empty canvas', () => {
    state.nodes = [];
    render(<CleanUpButton />);

    expect(main().disabled).toBe(true);
    expect(caret().disabled).toBe(true);
  });

  it('is disabled in read-only mode', () => {
    state.isReadOnly = true;
    render(<CleanUpButton />);

    expect(main().disabled).toBe(true);
    expect(caret().disabled).toBe(true);
  });

  it('ignores clicks while a clean-up is pending', () => {
    appBar = { onCleanUp: vi.fn(() => new Promise<void>(() => {})) };
    render(<CleanUpButton />);

    fireEvent.click(main());
    fireEvent.click(main());

    expect(appBar.onCleanUp).toHaveBeenCalledOnce();
    expect(main().getAttribute('aria-busy')).toBe('true');
    expect(caret().disabled).toBe(true);
  });

  it('becomes clickable again after the clean-up rejects', async () => {
    appBar = { onCleanUp: vi.fn(() => Promise.reject(new Error('x'))) };
    render(<CleanUpButton />);

    await act(async () => {
      fireEvent.click(main());
    });

    expect(main().getAttribute('aria-busy')).toBe('false');
    expect(caret().disabled).toBe(false);
    await act(async () => {
      fireEvent.click(main());
    });
    expect(appBar.onCleanUp).toHaveBeenCalledTimes(2);
  });
});
