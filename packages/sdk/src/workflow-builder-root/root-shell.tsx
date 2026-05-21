import type { ReactNode } from 'react';

import { OptionalAppChildren } from '../features/plugins-core/components/app/optional-app-children';
import { OptionalHooks } from '../features/plugins-core/components/app/optional-hooks';

import { DefaultLayout } from '../features/default-layout/default-layout';
import { useDetectLanguageChange } from '../features/i18n/use-detect-language-change';
import { AppLoaderContainer } from '../features/integration/components/app-loader/app-loader-container';
import { SnackbarContainer } from '../features/snackbar/snackbar-container';

/**
 * Internal subtree rendered inside the Root's integration + ReactFlow
 * providers. Hosts the global overlay (snackbar, app loader, plugin
 * hooks/children) and falls back to `<DefaultLayout />` when the Root has no
 * `children` prop.
 *
 * Split out of the Root component so its lifecycle (`useDetectLanguageChange`)
 * stays isolated while keeping the Root file focused on bootstrapping.
 */
export function RootShell({ children }: { children?: ReactNode }) {
  useDetectLanguageChange();

  return (
    <>
      {children ?? <DefaultLayout />}
      <SnackbarContainer />
      <AppLoaderContainer />
      <OptionalHooks />
      <OptionalAppChildren />
    </>
  );
}
