import { ArrowsOut, ClipboardText, Copy, DownloadSimple, Eye, Sparkle } from '@phosphor-icons/react';
import { getStoreEdges, getStoreNodes } from '@workflowbuilder/sdk';
import { Suspense, useEffect, useRef, useState } from 'react';

import styles from './visualize-card.module.css';

import { useExecutionStore } from '../../stores/use-execution-store';
import { adaptVisualization } from '../../utils/adapt-visualization';
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
// Formats the LLM "AI adapt" can convert into (markdown/text need no conversion).
const ADAPTABLE = new Set<VisualizeRenderer>(['diagram', 'chart', 'table', 'json', 'stat-cards']);

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
// visualization renders as part of the node itself. Reads the upstream node's
// output, picks a renderer (the node's `mode` or auto-detected), reveals it, and
// offers export, expand, and LLM "adapt" (manual button or the node's aiAdapt toggle).
export function VisualizeCard({ props }: Props) {
  const nodeId = props?.nodeId ?? '';
  const [forceChart, setForceChart] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [adaptedText, setAdaptedText] = useState<string | null>(null);
  const [adapting, setAdapting] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  // Node vocabulary and edges are static during a run, so snapshot reads are fine.
  const node = getStoreNodes().find((entry) => entry.id === nodeId);
  const isVisualizeNode = node?.data.type === 'ai-studio/visualize';
  const sourceId = getStoreEdges().find((edge) => edge.target === nodeId)?.source;

  const selfStatus = useExecutionStore((state) => state.nodeStates[nodeId]?.status);
  const sourceOutput = useExecutionStore((state) => (sourceId ? state.nodeStates[sourceId]?.output : undefined));

  const text = extractOutputText(sourceOutput);
  const hasOutput = selfStatus === 'completed' && text.length > 0;

  const properties = node?.data.properties as { mode?: string; aiAdapt?: boolean } | undefined;
  const mode: VisualizeMode =
    properties?.mode && VALID_MODES.has(properties.mode) ? (properties.mode as VisualizeMode) : 'auto';
  const aiAdapt = Boolean(properties?.aiAdapt);
  const detection = detectFormat(text);
  let activeRenderer: VisualizeRenderer = mode === 'auto' ? detection.renderer : mode;
  if (forceChart && mode === 'auto') {
    activeRenderer = 'chart';
  }

  const runAdapt = (format: VisualizeRenderer) => {
    setAdapting(true);
    adaptVisualization(text, format)
      .then((output) => setAdaptedText(output))
      .catch(() => {
        // keep the original content on failure
      })
      .finally(() => setAdapting(false));
  };

  // A fresh upstream output clears any prior adaptation / chart override.
  useEffect(() => {
    setAdaptedText(null);
    setForceChart(false);
  }, [text]);

  // When the node's aiAdapt toggle is on, auto-convert the output to the format.
  useEffect(() => {
    if (hasOutput && aiAdapt && ADAPTABLE.has(activeRenderer) && adaptedText === null && !adapting) {
      runAdapt(activeRenderer);
    }
  }, [hasOutput, aiAdapt, activeRenderer, text, adaptedText]);

  if (!isVisualizeNode) {
    return null;
  }

  const renderText = adaptedText ?? text;
  const data = adaptedText === null && mode === 'auto' ? detection.data : undefined;
  const Renderer = hasOutput ? getRenderer(activeRenderer) : null;
  const badge = mode === 'auto' ? `Auto › ${RENDERER_LABELS[activeRenderer]}` : RENDERER_LABELS[activeRenderer];
  const showChartChip = mode === 'auto' && Boolean(detection.chartable) && activeRenderer !== 'chart';
  const isVector = activeRenderer === 'chart' || activeRenderer === 'diagram';
  const showAdaptButton = ADAPTABLE.has(activeRenderer) && !aiAdapt;

  return (
    <div className={styles['integrated']}>
      {hasOutput && Renderer ? (
        <>
          <div className={styles['toolbar']}>
            <span className={styles['badge']}>{badge}</span>
            <div className={styles['actions']}>
              {showAdaptButton && (
                <button
                  type="button"
                  className={styles['action']}
                  title="AI: adapt to this format"
                  onClick={() => runAdapt(activeRenderer)}
                  disabled={adapting}
                >
                  <Sparkle weight={adaptedText ? 'fill' : 'regular'} />
                </button>
              )}
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
                onClick={() => void copySource(renderText)}
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
            {adapting ? (
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
      {expanded && (
        <VisualizeModal
          renderer={activeRenderer}
          text={renderText}
          data={data}
          badge={badge}
          isVector={isVector}
          onClose={() => setExpanded(false)}
        />
      )}
    </div>
  );
}
