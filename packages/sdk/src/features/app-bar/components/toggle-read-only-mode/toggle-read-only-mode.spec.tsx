import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const state = {
  isReadOnly: false,
  setReadOnly: vi.fn(),
};
vi.mock('../../../../store/store', () => ({
  useStore: <T,>(selector: (s: typeof state) => T) => selector(state),
}));

const { ToggleReadyOnlyMode } = await import('./toggle-read-only-mode');

const edit = () => screen.getByRole('button', { name: 'header.mode.edit' });
const readOnly = () => screen.getByRole('button', { name: 'header.mode.readOnly' });

describe('ToggleReadyOnlyMode', () => {
  beforeEach(() => {
    state.isReadOnly = false;
    state.setReadOnly = vi.fn();
  });

  it('renders the edit and read-only segments', () => {
    render(<ToggleReadyOnlyMode />);

    expect(screen.getAllByRole('button')).toHaveLength(2);
    expect(edit()).toBeTruthy();
    expect(readOnly()).toBeTruthy();
  });

  it('marks the segment that matches the store as active', () => {
    state.isReadOnly = true;
    render(<ToggleReadyOnlyMode />);

    expect(readOnly().getAttribute('aria-pressed')).toBe('true');
    expect(edit().getAttribute('aria-pressed')).toBe('false');
  });

  it('switches to read-only when the other segment is clicked', () => {
    render(<ToggleReadyOnlyMode />);

    fireEvent.click(readOnly());

    expect(state.setReadOnly).toHaveBeenCalledExactlyOnceWith(true);
  });

  it('switches back to edit mode from read-only', () => {
    state.isReadOnly = true;
    render(<ToggleReadyOnlyMode />);

    fireEvent.click(edit());

    expect(state.setReadOnly).toHaveBeenCalledExactlyOnceWith(false);
  });

  it('ignores a click on the active segment', () => {
    render(<ToggleReadyOnlyMode />);

    fireEvent.click(edit());

    expect(state.setReadOnly).not.toHaveBeenCalled();
  });
});
