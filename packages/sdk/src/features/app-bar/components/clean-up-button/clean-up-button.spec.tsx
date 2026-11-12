import { fireEvent, render, screen } from '@testing-library/react';
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

const cleanUpState = {
  isAvailable: true,
  layoutDirection: 'RIGHT' as 'RIGHT' | 'DOWN',
  isPending: false,
  isDisabled: false,
  cleanUp: vi.fn(),
};
vi.mock('./use-clean-up', () => ({
  useCleanUp: () => cleanUpState,
}));

const { CleanUpButton } = await import('./clean-up-button');

const MAIN = 'header.cleanUp.horizontal';
const CARET = 'header.cleanUp.chooseDirection';
const main = () => screen.getByRole('button', { name: MAIN }) as HTMLButtonElement;
const caret = () => screen.getByRole('button', { name: CARET }) as HTMLButtonElement;

describe('CleanUpButton', () => {
  beforeEach(() => {
    Object.assign(cleanUpState, {
      isAvailable: true,
      layoutDirection: 'RIGHT',
      isPending: false,
      isDisabled: false,
      cleanUp: vi.fn(),
    });
  });

  it('renders nothing while Clean up is not available', () => {
    cleanUpState.isAvailable = false;
    const { container } = render(<CleanUpButton />);

    expect(container.firstChild).toBeNull();
  });

  it('cleans up in the current direction on main click', () => {
    render(<CleanUpButton />);

    expect(main().dataset['tooltip']).toBe(MAIN);
    fireEvent.click(main());
    expect(cleanUpState.cleanUp).toHaveBeenCalledExactlyOnceWith();
  });

  it('cleans up in the direction picked from the menu', () => {
    render(<CleanUpButton />);

    fireEvent.click(screen.getByText('header.cleanUp.arrangeVertically'));

    expect(cleanUpState.cleanUp).toHaveBeenCalledExactlyOnceWith('DOWN');
  });

  it('marks the current direction as selected', () => {
    render(<CleanUpButton />);

    expect(menuItems.find((item) => item.label === 'header.cleanUp.arrangeHorizontally')?.selected).toBe(true);
    expect(menuItems.find((item) => item.label === 'header.cleanUp.arrangeVertically')?.selected).toBe(false);
  });

  it('is disabled while Clean up is disabled', () => {
    cleanUpState.isDisabled = true;
    render(<CleanUpButton />);

    expect(main().disabled).toBe(true);
    expect(caret().disabled).toBe(true);
  });

  it('shows as busy and locks the menu while a clean-up is pending', () => {
    cleanUpState.isPending = true;
    render(<CleanUpButton />);

    expect(main().getAttribute('aria-busy')).toBe('true');
    expect(caret().disabled).toBe(true);
  });
});
