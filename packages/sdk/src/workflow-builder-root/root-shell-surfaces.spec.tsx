import { act, render } from '@testing-library/react';
import i18n from 'i18next';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import '../features/i18n/index';
import { setTheme, usePersistedTheme } from '../hooks/theme';
import { resetThemeStore } from '../hooks/theme.test-utils';
import { RootShell } from './root-shell';

vi.mock('@workflowbuilder/ui', () => ({
  PortalContainerProvider: ({ children }: { children?: ReactNode }) => <>{children}</>,
}));
vi.mock('../features/default-layout/default-layout', () => ({ DefaultLayout: () => null }));
vi.mock('../features/editor-runtime/editor-runtime', () => ({ EditorRuntime: () => null }));
vi.mock('../features/modals/providers/modal-provider', () => ({ ModalProvider: () => null }));
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

beforeEach(resetThemeStore);

afterEach(async () => {
  await i18n.changeLanguage('en');
  document.documentElement.removeAttribute('lang');
});

describe('RootShell surfaces', () => {
  it('puts theme and lang on the root box and one portal container, never on <html>', () => {
    usePersistedTheme.setState({ theme: 'dark' });

    render(<RootShell />);

    expect(shell().dataset.wbTheme).toBe('dark');
    expect(shell().getAttribute('lang')).toBe(i18n.resolvedLanguage);
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

  it('declares the language it shows, not the one requested without a translation', async () => {
    render(<RootShell />);

    await act(() => i18n.changeLanguage('de-DE'));

    expect(i18n.language).toBe('de-DE');
    expect(shell().getAttribute('lang')).toBe('en');
    expect(portals()[0].getAttribute('lang')).toBe('en');
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
