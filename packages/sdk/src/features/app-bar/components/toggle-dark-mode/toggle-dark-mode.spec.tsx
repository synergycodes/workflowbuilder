import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

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

const { ToggleDarkMode } = await import('./toggle-dark-mode');

const light = () => screen.getByRole('button', { name: 'header.theme.light' });
const dark = () => screen.getByRole('button', { name: 'header.theme.dark' });

describe('ToggleDarkMode', () => {
  beforeEach(() => {
    themeState.theme = 'light';
    actions.setTheme = vi.fn();
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

  it('sets the theme through the action when the other segment is clicked', () => {
    render(<ToggleDarkMode />);

    fireEvent.click(dark());

    expect(actions.setTheme).toHaveBeenCalledExactlyOnceWith('dark');
  });

  it('ignores a click on the active segment', () => {
    render(<ToggleDarkMode />);

    fireEvent.click(light());

    expect(actions.setTheme).not.toHaveBeenCalled();
  });
});
