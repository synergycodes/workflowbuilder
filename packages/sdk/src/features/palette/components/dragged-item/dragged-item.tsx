import { type PropsWithChildren, forwardRef } from 'react';
import { createPortal } from 'react-dom';

import styles from './dragged-item.module.css';

import { isChrome, isFirefox, isOpera, isSafari } from '../../../../utils/browser';
import { useOptionalSdkSurfaces } from '../../../../workflow-builder-root/sdk-surfaces';

type DraggedItemProps = {
  zoom: number;
};

export const DraggedItem = forwardRef<HTMLDivElement, PropsWithChildren<DraggedItemProps>>(
  ({ children, zoom }: PropsWithChildren<DraggedItemProps>, ref) => {
    const surfaces = useOptionalSdkSurfaces();

    function getStyles() {
      if (isSafari && !isOpera && !isChrome) {
        return zoom > 1 ? { zoom: `${zoom}` } : { scale: `${zoom}` };
      }

      if (isFirefox) {
        return { scale: `${zoom}` };
      }

      return { zoom: `${zoom}` };
    }

    return createPortal(
      <div ref={ref} className={`${styles['container']} workflow-builder-root`} style={getStyles()}>
        {children}
      </div>,
      surfaces?.portal ?? document.body,
    );
  },
);
