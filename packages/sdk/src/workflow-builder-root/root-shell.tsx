import type { ReactNode } from 'react';

import { OptionalAppChildren } from '../features/plugins-core/components/app/optional-app-children';
import { OptionalHooks } from '../features/plugins-core/components/app/optional-hooks';

import { DefaultLayout } from '../features/default-layout/default-layout';
import { EditorRuntime } from '../features/editor-runtime/editor-runtime';
import { AppLoaderContainer } from '../features/integration/components/app-loader/app-loader-container';
import { ModalProvider } from '../features/modals/providers/modal-provider';
import { SnackbarContainer } from '../features/snackbar/snackbar-container';
import type { BuiltInControls } from '../features/ui-extensions/built-in-controls';
import { BuiltInControlsProvider, EMPTY_CONTROLS } from '../features/ui-extensions/built-in-controls-context';
import { UiExtensionProvider } from '../features/ui-extensions/ui-extension-context';

/**
 * Internal subtree rendered inside the Root's integration + ReactFlow
 * providers. Provides the Root's `builtInControls` and its UI extension
 * registry, mounts `<EditorRuntime />` and the rest of the global overlay
 * (snackbar, modal container, app loader, plugin hooks/children), and falls
 * back to `<DefaultLayout />` when the Root has no `children` prop.
 */
export function RootShell({ builtInControls, children }: { builtInControls?: BuiltInControls; children?: ReactNode }) {
  return (
    <BuiltInControlsProvider value={builtInControls ?? EMPTY_CONTROLS}>
      <UiExtensionProvider>
        <div className="workflow-builder-root workflow-builder-root-shell">
          {children ?? <DefaultLayout />}
          <EditorRuntime />
          <SnackbarContainer />
          <ModalProvider />
          <AppLoaderContainer />
          <OptionalHooks />
          <OptionalAppChildren />
        </div>
      </UiExtensionProvider>
    </BuiltInControlsProvider>
  );
}
