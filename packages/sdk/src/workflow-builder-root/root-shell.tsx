import { PortalContainerProvider } from '@workflowbuilder/ui';
import { type ReactNode, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { OptionalAppChildren } from '../features/plugins-core/components/app/optional-app-children';
import { OptionalHooks } from '../features/plugins-core/components/app/optional-hooks';

import { DefaultLayout } from '../features/default-layout/default-layout';
import { AppLoaderContainer } from '../features/integration/components/app-loader/app-loader-container';
import { SnackbarContainer } from '../features/snackbar/snackbar-container';
import { type Theme, selectTheme, useThemeStore } from '../hooks/theme';
import { type SdkSurfaces, SdkSurfacesProvider } from './sdk-surfaces';

type RootShellProps = {
  theme?: Theme;
  children?: ReactNode;
};

/**
 * Internal subtree rendered inside the Root's integration + ReactFlow
 * providers. Hosts the global overlay (snackbar, app loader, plugin
 * hooks/children) and falls back to `<DefaultLayout />` when the Root has no
 * `children` prop.
 */
export function RootShell({ theme, children }: RootShellProps) {
  return (
    <SurfacesRoot theme={theme}>
      {children ?? <DefaultLayout />}
      <SnackbarContainer />
      <AppLoaderContainer />
      <OptionalHooks />
      <OptionalAppChildren />
    </SurfacesRoot>
  );
}

// Owns everything that changes (theme, language, the portal container) and gets the editor as
// `children`, so those changes re-render the root box and context consumers, not the canvas.
function SurfacesRoot({ theme, children }: { theme?: Theme; children: ReactNode }) {
  const storeTheme = useThemeStore(selectTheme);
  // The host's prop is right on the first render; the store catches up in Root's layout effect.
  const activeTheme = theme ?? storeTheme;
  const { i18n } = useTranslation();
  const language = i18n.language;

  const rootRef = useRef<HTMLDivElement>(null);
  const [portal, setPortal] = useState<HTMLDivElement | null>(null);
  // A new object once the container exists: Base UI reads a ref's `.current` once per object,
  // and a popup open on the first commit would otherwise settle on document.body.
  const portalContainer = useMemo(() => ({ current: portal }), [portal]);

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

  const surfaces = useMemo<SdkSurfaces>(() => ({ root: rootRef, portal }), [portal]);

  return (
    <div
      ref={rootRef}
      className="workflow-builder-root workflow-builder-root-shell"
      data-wb-theme={activeTheme}
      lang={language}
    >
      <SdkSurfacesProvider value={surfaces}>
        <PortalContainerProvider container={portalContainer}>{children}</PortalContainerProvider>
      </SdkSurfacesProvider>
    </div>
  );
}
