import { PortalContainerProvider } from '@workflowbuilder/ui';
import { type ReactNode, useLayoutEffect, useRef, useState } from 'react';
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
import { HostThemeContext } from '../hooks/host-theme-context';
import { type Theme, useTheme } from '../hooks/use-theme';
import { SdkRootProvider } from './sdk-root';

type RootShellProps = {
  theme?: Theme;
  builtInControls?: BuiltInControls;
  children?: ReactNode;
};

/**
 * Internal subtree rendered inside the Root's UI extension registry and its
 * integration + ReactFlow providers. Provides the Root's `builtInControls`,
 * mounts `<EditorRuntime />` and the rest of the global overlay
 * (snackbar, modal container, app loader, plugin hooks/children), and falls
 * back to `<DefaultLayout />` when the Root has no `children` prop.
 */
export function RootShell({ theme, builtInControls, children }: RootShellProps) {
  return (
    <BuiltInControlsProvider value={builtInControls ?? EMPTY_CONTROLS}>
      <HostThemeContext.Provider value={theme ?? null}>
        <SurfacesRoot>
          {children ?? <DefaultLayout />}
          <EditorRuntime />
          <SnackbarContainer />
          <ModalProvider />
          <AppLoaderContainer />
          <OptionalHooks />
          <OptionalAppChildren />
        </SurfacesRoot>
      </HostThemeContext.Provider>
    </BuiltInControlsProvider>
  );
}

// `null` without a DOM (server rendering); popups then wait for the client.
function createPortalContainer(): HTMLDivElement | null {
  if (typeof document === 'undefined') return null;
  const container = document.createElement('div');
  container.className = 'workflow-builder-root wb-portal';
  return container;
}

// Owns everything that changes (theme, language, the portal container) and gets the editor as
// `children`, so those changes re-render the root box and context consumers, not the canvas.
// The popup container reaches SDK code through the UI library's `usePortalContainer()`.
function SurfacesRoot({ children }: { children: ReactNode }) {
  const { theme: activeTheme } = useTheme();
  const { i18n } = useTranslation();
  const language = i18n.resolvedLanguage ?? i18n.language;

  const rootRef = useRef<HTMLDivElement>(null);
  // Exists from the first render, so a snackbar a child shows from its mount effect has somewhere to go;
  // attached to <body> before any such effect runs.
  const [portal] = useState(createPortalContainer);

  useLayoutEffect(() => {
    if (!portal) return;
    document.body.append(portal);
    return () => portal.remove();
  }, [portal]);

  useLayoutEffect(() => {
    if (!portal) return;
    portal.dataset.wbTheme = activeTheme;
    portal.lang = language;
  }, [portal, activeTheme, language]);

  return (
    <div
      ref={rootRef}
      className="workflow-builder-root workflow-builder-root-shell"
      data-wb-theme={activeTheme}
      lang={language}
    >
      <SdkRootProvider value={rootRef}>
        <PortalContainerProvider container={portal}>{children}</PortalContainerProvider>
      </SdkRootProvider>
    </div>
  );
}
