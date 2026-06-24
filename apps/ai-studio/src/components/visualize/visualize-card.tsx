import { ArrowsOut, ClipboardText, Copy, DownloadSimple, Eye } from '@phosphor-icons/react';
import { getStoreEdges, getStoreNodes } from '@workflowbuilder/sdk';
import { type ReactNode, Suspense, useRef, useState } from 'react';

import styles from './visualize-card.module.css';

import { useExecutionStore } from '../../stores/use-execution-store';
import { type VisualizeRenderer, detectFormat } from '../../utils/detect-format';
import { copyImage, copySource, downloadPng } from '../../utils/export-visualization';
import { extractOutputText } from '../../utils/extract-output-text';
import { RENDERER_LABELS, getRenderer } from './renderers';
import { VisualizeModal } from './visualize-modal';

type Props = {
  props?: {
    nodeId: string;
  };
};

type VisualizeMode = VisualizeRenderer | 'auto';
const VALID_MODES = new Set<string>(['auto', 'markdown', 'text', 'json', 'table', 'stat-cards', 'chart', 'diagram']);

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

// Rendered on-canvas inside every node via the OptionalNodeContent decorator,
// but only paints for visualize nodes. Always shows a fixed-size card (with an
// empty-state placeholder before a run); once the upstream output arrives it
// picks a renderer (the node's `mode` or auto-detected), reveals it, and offers
// export + expand actions.
export function VisualizeCard({ props }: Props) {
  const nodeId = props?.nodeId ?? '';
  const [forceChart, setForceChart] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  // Node vocabulary and edges are static during a run, so snapshot reads are fine.
  const node = getStoreNodes().find((entry) => entry.id === nodeId);
  const isVisualizeNode = node?.data.type === 'ai-studio/visualize';
  const sourceId = getStoreEdges().find((edge) => edge.target === nodeId)?.source;

  const selfStatus = useExecutionStore((state) => state.nodeStates[nodeId]?.status);
  const sourceOutput = useExecutionStore((state) => (sourceId ? state.nodeStates[sourceId]?.output : undefined));

  if (!isVisualizeNode) {
    return null;
  }

  const text = extractOutputText(sourceOutput);
  const hasOutput = selfStatus === 'completed' && text.length > 0;

  let body: ReactNode;
  let badge = '';
  let showChartChip = false;
  let activeRenderer: VisualizeRenderer | null = null;
  let data: unknown;

  if (hasOutput) {
    const modeRaw = (node?.data.properties as { mode?: string } | undefined)?.mode;
    const mode: VisualizeMode = modeRaw && VALID_MODES.has(modeRaw) ? (modeRaw as VisualizeMode) : 'auto';
    const detection = detectFormat(text);
    activeRenderer = mode === 'auto' ? detection.renderer : mode;
    if (forceChart && mode === 'auto') {
      activeRenderer = 'chart';
    }
    data = mode === 'auto' ? detection.data : undefined;
    const Renderer = getRenderer(activeRenderer);
    badge = mode === 'auto' ? `Auto › ${RENDERER_LABELS[activeRenderer]}` : RENDERER_LABELS[activeRenderer];
    showChartChip = mode === 'auto' && Boolean(detection.chartable) && activeRenderer !== 'chart';
    body = (
      <>
        {showChartChip && (
          <button className={styles['chip']} onClick={() => setForceChart(true)} type="button">
            Try as chart
          </button>
        )}
        <Suspense
          fallback={
            <div className={styles['empty']}>
              <p className={styles['empty-text']}>Loading…</p>
            </div>
          }
        >
          <div ref={contentRef} className={styles['revealed']}>
            <Renderer text={text} data={data} />
          </div>
        </Suspense>
      </>
    );
  } else {
    body = <EmptyState running={selfStatus === 'running'} />;
  }

  const isVector = activeRenderer === 'chart' || activeRenderer === 'diagram';

  return (
    <div className={styles['card']}>
      <div className={styles['header']}>
        <Eye className={styles['header-icon']} weight="fill" />
        <span className={styles['header-title']}>Visualize</span>
        {badge && <span className={styles['badge']}>{badge}</span>}
        {hasOutput && (
          <div className={styles['actions']}>
            <button type="button" className={styles['action']} title="Expand" onClick={() => setExpanded(true)}>
              <ArrowsOut />
            </button>
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
            <button
              type="button"
              className={styles['action']}
              title="Copy source text"
              onClick={() => void copySource(text)}
            >
              <ClipboardText />
            </button>
          </div>
        )}
      </div>
      <div className={styles['body']}>{body}</div>
      {expanded && activeRenderer && (
        <VisualizeModal
          renderer={activeRenderer}
          text={text}
          data={data}
          badge={badge}
          isVector={isVector}
          onClose={() => setExpanded(false)}
        />
      )}
    </div>
  );
}
