import { ArrowsOut, ClipboardText, Copy, DownloadSimple, Eye } from '@phosphor-icons/react';
import { getStoreEdges, getStoreNodes } from '@workflowbuilder/sdk';
import { Suspense, useRef, useState } from 'react';

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

// Injected into the node body via the OptionalNodeContent decorator, so the
// visualization renders as part of the node itself (the node grows to contain
// it) rather than as a detached panel. Only paints for visualize nodes. Reads
// the upstream node's output (via the incoming edge), picks a renderer (the
// node's `mode` or auto-detected), reveals it, and offers export + expand.
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

  let badge = '';
  let showChartChip = false;
  let activeRenderer: VisualizeRenderer | null = null;
  let data: unknown;
  let Renderer: ReturnType<typeof getRenderer> | null = null;

  if (hasOutput) {
    const modeRaw = (node?.data.properties as { mode?: string } | undefined)?.mode;
    const mode: VisualizeMode = modeRaw && VALID_MODES.has(modeRaw) ? (modeRaw as VisualizeMode) : 'auto';
    const detection = detectFormat(text);
    activeRenderer = mode === 'auto' ? detection.renderer : mode;
    if (forceChart && mode === 'auto') {
      activeRenderer = 'chart';
    }
    data = mode === 'auto' ? detection.data : undefined;
    Renderer = getRenderer(activeRenderer);
    badge = mode === 'auto' ? `Auto › ${RENDERER_LABELS[activeRenderer]}` : RENDERER_LABELS[activeRenderer];
    showChartChip = mode === 'auto' && Boolean(detection.chartable) && activeRenderer !== 'chart';
  }

  const isVector = activeRenderer === 'chart' || activeRenderer === 'diagram';

  return (
    <div className={styles['integrated']}>
      {hasOutput && Renderer ? (
        <>
          <div className={styles['toolbar']}>
            <span className={styles['badge']}>{badge}</span>
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
          </div>
          {showChartChip && (
            <button className={styles['chip']} onClick={() => setForceChart(true)} type="button">
              Try as chart
            </button>
          )}
          <div className={styles['body']}>
            <Suspense fallback={<p className={styles['empty-text']}>Loading…</p>}>
              <div ref={contentRef} className={styles['revealed']}>
                <Renderer text={text} data={data} />
              </div>
            </Suspense>
          </div>
        </>
      ) : (
        <EmptyState running={selfStatus === 'running'} />
      )}
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
