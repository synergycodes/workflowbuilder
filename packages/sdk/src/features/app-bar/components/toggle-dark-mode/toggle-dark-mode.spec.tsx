import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const themeState = {
  theme: 'light' as 'light' | 'dark',
  toggleTheme: vi.fn(),
};
vi.mock('../../../../hooks/use-theme', () => ({
  useTheme: () => themeState,
}));

const { ToggleDarkMode } = await import('./toggle-dark-mode');

const light = () => screen.getByRole('button', { name: 'header.theme.light' });
const dark = () => screen.getByRole('button', { name: 'header.theme.dark' });

describe('ToggleDarkMode', () => {
  beforeEach(() => {
    themeState.theme = 'light';
    themeState.toggleTheme = vi.fn();
  });

  it('renders the light and dark segments', () => {
    render(<ToggleDarkMode />);

    expect(screen.getAllByRole('button')).toHaveLength(2);
    expect(light()).toBeTruthy();
    expect(dark()).toBeTruthy();
  });

  it('marks the segment that matches the current theme as active', () => {
    themeState.theme = 'dark';
    render(<ToggleDarkMode />);

    expect(dark().getAttribute('aria-pressed')).toBe('true');
    expect(light().getAttribute('aria-pressed')).toBe('false');
  });

  it('toggles the theme when the other segment is clicked', () => {
    render(<ToggleDarkMode />);

    fireEvent.click(dark());

    expect(themeState.toggleTheme).toHaveBeenCalledOnce();
  });

  it('ignores a click on the active segment', () => {
    render(<ToggleDarkMode />);

    fireEvent.click(light());

    expect(themeState.toggleTheme).not.toHaveBeenCalled();
  });
});
