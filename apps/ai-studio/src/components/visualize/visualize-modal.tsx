import { ClipboardText, Copy, DownloadSimple, FileSvg, X } from '@phosphor-icons/react';
import { Suspense, useRef } from 'react';
import { createPortal } from 'react-dom';

import styles from './visualize-modal.module.css';

import type { VisualizeRenderer } from '../../utils/detect-format';
import { copyImage, copySource, downloadPng, downloadSvg } from '../../utils/export-visualization';
import { getRenderer } from './renderers';

type Props = {
  renderer: VisualizeRenderer;
  text: string;
  data?: unknown;
  badge: string;
  isVector: boolean;
  onClose: () => void;
};

// Full-size view of a visualization. Rendered through a portal to document.body
// so its fixed overlay escapes the transformed React Flow viewport.
export function VisualizeModal({ renderer, text, data, badge, isVector, onClose }: Props) {
  const contentRef = useRef<HTMLDivElement>(null);
  const Renderer = getRenderer(renderer);

  return createPortal(
    <div className={styles['overlay']} role="presentation" onClick={onClose}>
      <div className={styles['modal']} role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
        <div className={styles['header']}>
          <span className={styles['title']}>Visualize</span>
          <span className={styles['badge']}>{badge}</span>
          <div className={styles['actions']}>
            <button
              type="button"
              className={styles['action']}
              title="Copy image"
              onClick={() => contentRef.current && void copyImage(contentRef.current)}
            >
              <Copy />
            </button>
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
            <button
              type="button"
              className={styles['action']}
              title="Copy source text"
              onClick={() => void copySource(text)}
            >
              <ClipboardText />
            </button>
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
    document.body,
  );
}
