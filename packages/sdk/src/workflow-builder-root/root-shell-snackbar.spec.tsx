import { render } from '@testing-library/react';
import { useEffect } from 'react';
import { describe, expect, it, vi } from 'vitest';

import '../features/i18n/index';
import { showSnackbar } from '../features/snackbar/show-snackbar';
import { RootShell } from './root-shell';

vi.mock('../features/default-layout/default-layout', () => ({ DefaultLayout: () => null }));
vi.mock('../features/editor-runtime/editor-runtime', () => ({ EditorRuntime: () => null }));
vi.mock('../features/modals/providers/modal-provider', () => ({ ModalProvider: () => null }));
vi.mock('../features/integration/components/app-loader/app-loader-container', () => ({
  AppLoaderContainer: () => null,
}));
vi.mock('../features/plugins-core/components/app/optional-hooks', () => ({ OptionalHooks: () => null }));
vi.mock('../features/plugins-core/components/app/optional-app-children', () => ({
  OptionalAppChildren: () => null,
}));

function ShowsSnackbarOnMount() {
  useEffect(() => {
    showSnackbar({ variant: 'info', title: 'Shown on mount', autoHideDuration: null });
  }, []);
  return null;
}

describe('RootShell snackbars', () => {
  // AI Studio's OpenNotices shows queued notices from a mount effect like this one.
  it('keeps a snackbar a child shows while mounting, in the portal container', () => {
    render(
      <RootShell>
        <ShowsSnackbarOnMount />
      </RootShell>,
    );

    expect(document.body.querySelector(':scope > .wb-portal')?.textContent).toContain('Shown on mount');
  });
});
