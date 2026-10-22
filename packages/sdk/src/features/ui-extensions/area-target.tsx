import clsx from 'clsx';
import { useCallback } from 'react';

import styles from './area-target.module.css';

import { useUiExtensionRegistry } from './ui-extension-context';
import type { AreaId, AreaPlace } from './ui-extension-registry';

type AreaTargetProps = {
  area: AreaId;
  place?: AreaPlace;
  className?: string;
};

/**
 * Where a host shows the content of an area. The host keeps it mounted while the area is shown;
 * CSS hides it while it is empty, so content changes never remount it.
 */
export function AreaTarget({ area, place = 'before', className }: AreaTargetProps) {
  const registry = useUiExtensionRegistry();
  const setElement = useCallback(
    (element: HTMLDivElement | null) => registry?.setAreaElement(area, element, place),
    [registry, area, place],
  );

  return <div ref={setElement} className={clsx(styles['target'], className)} />;
}
