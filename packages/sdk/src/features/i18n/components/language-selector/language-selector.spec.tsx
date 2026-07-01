import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

// Controllable i18n stub — each test sets `language` / `resolvedLanguage`.
const i18nState = { language: 'en', resolvedLanguage: 'en', changeLanguage: vi.fn() };

// Render the Menu's trigger (children) so the displayed language code is queryable.
vi.mock('@synergycodes/overflow-ui', () => ({
  Menu: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  NavButton: ({ children }: { children?: ReactNode }) => <button type="button">{children}</button>,
}));

vi.mock('@workflow-builder/icons', () => ({
  Icon: () => null,
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: i18nState }),
}));

const { LanguageSelector } = await import('./language-selector');

describe('LanguageSelector — label reflects the resolved language', () => {
  it('shows PL for a regional Polish locale that resolves to pl (regression: used to show EN)', () => {
    i18nState.language = 'pl-PL';
    i18nState.resolvedLanguage = 'pl';

    render(<LanguageSelector />);

    expect(screen.getByText('PL')).toBeTruthy();
    expect(screen.queryByText('EN')).toBeNull();
  });

  it('shows EN for english', () => {
    i18nState.language = 'en';
    i18nState.resolvedLanguage = 'en';

    render(<LanguageSelector />);

    expect(screen.getByText('EN')).toBeTruthy();
  });
});
