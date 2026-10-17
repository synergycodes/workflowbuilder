import clsx from 'clsx';
import { useCallback } from 'react';

import styles from './area-target.module.css';

import { useUiExtensionRegistry } from './ui-extension-context';
import type { AreaId } from './ui-extension-registry';

type AreaTargetProps = {
  area: AreaId;
  className?: string;
};

/**
 * Where a host shows the content of an area. The host keeps it mounted while the area is shown;
 * CSS hides it while it is empty, so content changes never remount it.
 */
export function AreaTarget({ area, className }: AreaTargetProps) {
  const registry = useUiExtensionRegistry();
  const setElement = useCallback(
    (element: HTMLDivElement | null) => registry?.setAreaElement(area, element),
    [registry, area],
  );

  return <div ref={setElement} className={clsx(styles['target'], className)} />;
}
