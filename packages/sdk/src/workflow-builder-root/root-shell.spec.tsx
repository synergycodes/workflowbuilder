import { act, render } from '@testing-library/react';
import i18n from 'i18next';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import '../features/i18n/index';
import { setTheme, useThemeStore } from '../hooks/theme';
import { RootShell } from './root-shell';

vi.mock('@workflowbuilder/ui', () => ({
  PortalContainerProvider: ({ children }: { children?: ReactNode }) => <>{children}</>,
}));
vi.mock('../features/default-layout/default-layout', () => ({ DefaultLayout: () => null }));
vi.mock('../features/snackbar/snackbar-container', () => ({ SnackbarContainer: () => null }));
vi.mock('../features/integration/components/app-loader/app-loader-container', () => ({
  AppLoaderContainer: () => null,
}));
vi.mock('../features/plugins-core/components/app/optional-hooks', () => ({ OptionalHooks: () => null }));
vi.mock('../features/plugins-core/components/app/optional-app-children', () => ({
  OptionalAppChildren: () => null,
}));

function shell(): HTMLElement {
  return document.querySelector<HTMLElement>('.workflow-builder-root-shell')!;
}

function portals(): NodeListOf<HTMLElement> {
  return document.body.querySelectorAll<HTMLElement>(':scope > .wb-portal');
}

beforeEach(() => {
  useThemeStore.setState({ persisted: 'light', controlled: null, onChange: null });
  localStorage.clear();
});

afterEach(async () => {
  await i18n.changeLanguage('en');
  document.documentElement.removeAttribute('lang');
});

describe('RootShell', () => {
  it('puts theme and lang on the root box and one portal container, never on <html>', () => {
    useThemeStore.setState({ persisted: 'dark' });

    render(<RootShell />);

    expect(shell().dataset.wbTheme).toBe('dark');
    expect(shell().getAttribute('lang')).toBe(i18n.language);
    expect(portals()).toHaveLength(1);
    expect(portals()[0].classList.contains('workflow-builder-root')).toBe(true);
    expect(portals()[0].dataset.wbTheme).toBe('dark');
    expect(document.documentElement.dataset.wbTheme).toBeUndefined();
  });

  it('shows the theme prop on the first render', () => {
    render(<RootShell theme="dark" />);

    expect(shell().dataset.wbTheme).toBe('dark');
  });

  it('removes the portal container on unmount', () => {
    const { unmount } = render(<RootShell />);

    unmount();

    expect(document.body.querySelector('.wb-portal')).toBeNull();
  });

  it('mirrors a theme change onto both surfaces', () => {
    render(<RootShell />);

    act(() => setTheme('dark'));

    expect(shell().dataset.wbTheme).toBe('dark');
    expect(portals()[0].dataset.wbTheme).toBe('dark');
  });

  it('mirrors a language change onto both surfaces and leaves <html lang> alone', async () => {
    document.documentElement.lang = 'de';
    render(<RootShell />);

    await act(() => i18n.changeLanguage('pl'));

    expect(shell().getAttribute('lang')).toBe('pl');
    expect(portals()[0].getAttribute('lang')).toBe('pl');
    expect(document.documentElement.lang).toBe('de');
  });
});
