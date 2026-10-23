import { useLayoutEffect } from 'react';

import { useOptionalSdkSurfaces } from '../../../../workflow-builder-root/sdk-surfaces';

type OverlayKind = 'variable-picker';

export function OverlayAttribute({ kind }: { kind: OverlayKind }): null {
  const surfaces = useOptionalSdkSurfaces();

  useLayoutEffect(() => {
    const root = surfaces?.root.current;
    if (!root) return;

    root.dataset.wbOverlay = kind;
    return () => {
      delete root.dataset.wbOverlay;
    };
  }, [surfaces, kind]);

  return null;
}
