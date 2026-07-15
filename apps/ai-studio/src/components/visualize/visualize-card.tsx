import { ArrowsOut, DownloadSimple, Eye } from '@phosphor-icons/react';
import { getStoreEdges, getStoreNodes } from '@workflowbuilder/sdk';
import { Suspense, useRef, useState } from 'react';

import styles from './visualize-card.module.css';

import { useAdaptedVisualization } from '../../hooks/use-adapted-visualization';
import { VISUALIZE_MODES } from '../../nodes/visualize/schema';
import { useExecutionStore } from '../../stores/use-execution-store';
import { type VisualizeRenderer, detectFormat } from '../../utils/detect-format';
import { downloadPng } from '../../utils/export-visualization';
import { extractOutputText } from '../../utils/extract-output-text';
import { CopyResultButton } from './copy-result-button';
import { RENDERER_LABELS, getRenderer } from './renderers';
import { VisualizeModal } from './visualize-modal';

type Props = {
  props?: {
    nodeId: string;
  };
};

type VisualizeMode = VisualizeRenderer | 'auto';
const VALID_MODES = new Set<string>(VISUALIZE_MODES);

function EmptyState({ running }: { running: boolean }) {
  if (running) {
    return (
      <div className={styles['empty']}>
        <div className={styles['dots']}>
          <span className={styles['dot']} />
          <span className={styles['dot']} />
          <span className={styles['dot']} />
        </div>
        <p className={styles['empty-text']}>Generating visualization…</p>
      </div>
    );
  }
  return (
    <div className={styles['empty']}>
      <Eye className={styles['empty-icon']} weight="duotone" />
      <p className={styles['empty-text']}>The visualization appears here after you run the workflow.</p>
    </div>
  );
}

export function VisualizeCard({ props }: Props) {
  const nodeId = props?.nodeId ?? '';
  const [isExpanded, setIsExpanded] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  // Nodes/edges are static during a run, so snapshot reads are fine.
  const node = getStoreNodes().find((entry) => entry.id === nodeId);
  const isVisualizeNode = node?.data.type === 'ai-studio/visualize';
  const sourceId = getStoreEdges().find((edge) => edge.target === nodeId)?.source;

  const selfStatus = useExecutionStore((state) => state.nodeStates[nodeId]?.status);
  const sourceOutput = useExecutionStore((state) => (sourceId ? state.nodeStates[sourceId]?.output : undefined));

  const text = extractOutputText(sourceOutput);
  const hasOutput = selfStatus === 'completed' && text.length > 0;

  const properties = node?.data.properties as { mode?: string } | undefined;
  const mode: VisualizeMode =
    properties?.mode && VALID_MODES.has(properties.mode) ? (properties.mode as VisualizeMode) : 'auto';
  const detection = detectFormat(text);
  const activeRenderer: VisualizeRenderer = mode === 'auto' ? detection.renderer : mode;

  const { adaptedText, isAdapting } = useAdaptedVisualization(text, activeRenderer, hasOutput);

  if (!isVisualizeNode) {
    return null;
  }

  const renderText = adaptedText ?? text;
  const data = adaptedText === null && mode === 'auto' ? detection.data : undefined;
  const Renderer = hasOutput ? getRenderer(activeRenderer) : null;
  const badge = mode === 'auto' ? `Auto › ${RENDERER_LABELS[activeRenderer]}` : RENDERER_LABELS[activeRenderer];
  const isVector = activeRenderer === 'chart' || activeRenderer === 'diagram';

  return (
    <div className={styles['integrated']}>
      {hasOutput && Renderer ? (
        <>
          <div className={styles['toolbar']}>
            <span className={styles['badge']}>{badge}</span>
            <div className={styles['actions']}>
              <button type="button" className={styles['action']} title="Expand" onClick={() => setIsExpanded(true)}>
                <ArrowsOut />
              </button>
              <CopyResultButton
                className={styles['action']}
                getTarget={() => contentRef.current}
                text={renderText}
                disabled={isAdapting}
              />
              <button
                type="button"
                className={styles['action']}
                title="Download PNG"
                disabled={isAdapting}
                onClick={() => contentRef.current && void downloadPng(contentRef.current)}
              >
                <DownloadSimple />
              </button>
            </div>
          </div>
          <div className={styles['body']}>
            {isAdapting ? (
              <div className={styles['empty']}>
                <div className={styles['dots']}>
                  <span className={styles['dot']} />
                  <span className={styles['dot']} />
                  <span className={styles['dot']} />
                </div>
                <p className={styles['empty-text']}>Adapting with AI…</p>
              </div>
            ) : (
              <Suspense fallback={<p className={styles['empty-text']}>Loading…</p>}>
                <div ref={contentRef} className={styles['revealed']}>
                  <Renderer text={renderText} data={data} />
                </div>
              </Suspense>
            )}
          </div>
        </>
      ) : (
        <EmptyState running={selfStatus === 'running'} />
      )}
      {isExpanded && (
        <VisualizeModal
          renderer={activeRenderer}
          text={renderText}
          data={data}
          badge={badge}
          isVector={isVector}
          onClose={() => setIsExpanded(false)}
        />
      )}
    </div>
  );
}
