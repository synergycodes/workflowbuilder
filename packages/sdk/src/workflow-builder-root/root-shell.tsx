import { PortalContainerProvider } from '@workflowbuilder/ui';
import { type ReactNode, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

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
import { type Theme, useTheme } from '../hooks/use-theme';
import { type SdkSurfaces, SdkSurfacesProvider } from './sdk-surfaces';

type RootShellProps = {
  theme?: Theme;
  builtInControls?: BuiltInControls;
  children?: ReactNode;
};

/**
 * Internal subtree rendered inside the Root's integration + ReactFlow
 * providers. Provides the Root's `builtInControls` and its UI extension
 * registry, mounts `<EditorRuntime />` and the rest of the global overlay
 * (snackbar, modal container, app loader, plugin hooks/children), and falls
 * back to `<DefaultLayout />` when the Root has no `children` prop.
 */
export function RootShell({ theme, builtInControls, children }: RootShellProps) {
  return (
    <BuiltInControlsProvider value={builtInControls ?? EMPTY_CONTROLS}>
      <UiExtensionProvider>
        <SurfacesRoot theme={theme}>
          {children ?? <DefaultLayout />}
          <EditorRuntime />
          <SnackbarContainer />
          <ModalProvider />
          <AppLoaderContainer />
          <OptionalHooks />
          <OptionalAppChildren />
        </SurfacesRoot>
      </UiExtensionProvider>
    </BuiltInControlsProvider>
  );
}

// Owns everything that changes (theme, language, the portal container) and gets the editor as
// `children`, so those changes re-render the root box and context consumers, not the canvas.
// The popup container reaches SDK code through the UI library's `usePortalContainer()`.
function SurfacesRoot({ theme, children }: { theme?: Theme; children: ReactNode }) {
  const { theme: storeTheme } = useTheme();
  // The host's prop is right on the first render; the store catches up in Root's layout effect.
  const activeTheme = theme ?? storeTheme;
  const { i18n } = useTranslation();
  const language = i18n.resolvedLanguage ?? i18n.language;

  const rootRef = useRef<HTMLDivElement>(null);
  // `null` until the layout effect below creates it; popups wait for it instead of using document.body.
  const [portal, setPortal] = useState<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    const container = document.createElement('div');
    container.className = 'workflow-builder-root wb-portal';
    document.body.append(container);
    setPortal(container);

    return () => {
      container.remove();
      setPortal(null);
    };
  }, []);

  useLayoutEffect(() => {
    if (!portal) return;
    portal.dataset.wbTheme = activeTheme;
    portal.lang = language;
  }, [portal, activeTheme, language]);

  const surfaces = useMemo<SdkSurfaces>(() => ({ root: rootRef }), []);

  return (
    <div
      ref={rootRef}
      className="workflow-builder-root workflow-builder-root-shell"
      data-wb-theme={activeTheme}
      lang={language}
    >
      <SdkSurfacesProvider value={surfaces}>
        <PortalContainerProvider container={portal}>{children}</PortalContainerProvider>
      </SdkSurfacesProvider>
    </div>
  );
}
