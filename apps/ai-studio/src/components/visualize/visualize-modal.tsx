import { DownloadSimple, FileSvg, X } from '@phosphor-icons/react';
import { usePortalContainer } from '@workflowbuilder/ui';
import { Suspense, useRef } from 'react';
import { createPortal } from 'react-dom';

import styles from './visualize-modal.module.css';

import type { VisualizeRenderer } from '../../utils/detect-format';
import { downloadPng, downloadSvg } from '../../utils/export-visualization';
import { CopyResultButton } from './copy-result-button';
import { getRenderer } from './renderers';

type Props = {
  renderer: VisualizeRenderer;
  text: string;
  data?: unknown;
  badge: string;
  isVector: boolean;
  onClose: () => void;
};

// Portaled out of the transformed React Flow viewport, into the editor's popup container so the
// overlay keeps the theme tokens; body is the fallback outside <WorkflowBuilder.Root>.
export function VisualizeModal({ renderer, text, data, badge, isVector, onClose }: Props) {
  const contentRef = useRef<HTMLDivElement>(null);
  const portalContainer = usePortalContainer();
  const Renderer = getRenderer(renderer);

  return createPortal(
    <div className={styles['overlay']} role="presentation" onClick={onClose}>
      <div className={styles['modal']} role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
        <div className={styles['header']}>
          <span className={styles['title']}>Visualize</span>
          <span className={styles['badge']}>{badge}</span>
          <div className={styles['actions']}>
            <CopyResultButton className={styles['action']} getTarget={() => contentRef.current} text={text} />
            <button
              type="button"
              className={styles['action']}
              title="Download PNG"
              onClick={() => contentRef.current && void downloadPng(contentRef.current)}
            >
              <DownloadSimple />
            </button>
            {isVector && (
              <button
                type="button"
                className={styles['action']}
                title="Download SVG"
                onClick={() => contentRef.current && void downloadSvg(contentRef.current)}
              >
                <FileSvg />
              </button>
            )}
            <button type="button" className={styles['action']} title="Close" onClick={onClose}>
              <X weight="bold" />
            </button>
          </div>
        </div>
        <div ref={contentRef} className={styles['body']}>
          <Suspense fallback={<p className={styles['loading']}>Loading…</p>}>
            <Renderer text={text} data={data} />
          </Suspense>
        </div>
      </div>
    </div>,
    portalContainer ?? document.body,
  );
}
