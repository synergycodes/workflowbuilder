import { useLayoutEffect } from 'react';

import { useOptionalSdkRoot } from '../../../../workflow-builder-root/sdk-root';

type OverlayKind = 'variable-picker';

export function OverlayAttribute({ kind }: { kind: OverlayKind }): null {
  const rootRef = useOptionalSdkRoot();

  useLayoutEffect(() => {
    const root = rootRef?.current;
    if (!root) return;

    root.dataset.wbOverlay = kind;
    return () => {
      delete root.dataset.wbOverlay;
    };
  }, [rootRef, kind]);

  return null;
}
