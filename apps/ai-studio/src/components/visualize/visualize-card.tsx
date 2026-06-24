import { Eye } from '@phosphor-icons/react';
import { getStoreEdges, getStoreNodes } from '@workflowbuilder/sdk';

import styles from './visualize-card.module.css';

import { useExecutionStore } from '../../stores/use-execution-store';
import { type VisualizeRenderer, detectFormat } from '../../utils/detect-format';
import { extractOutputText } from '../../utils/extract-output-text';
import { RENDERER_LABELS, getRenderer } from './renderers';

type Props = {
  props?: {
    nodeId: string;
  };
};

type VisualizeMode = VisualizeRenderer | 'auto';
const VALID_MODES = new Set<string>(['auto', 'markdown', 'text', 'json', 'table', 'stat-cards', 'chart', 'diagram']);

// Rendered on-canvas inside every node via the OptionalNodeContent decorator,
// but only paints for visualize nodes. Reads the upstream node's output (via the
// incoming edge), picks a renderer (the node's `mode`, or auto-detected), and
// renders it in a framed card that reveals with an animation once the node finishes.
export function VisualizeCard({ props }: Props) {
  const nodeId = props?.nodeId ?? '';

  // Node vocabulary and edges are static during a run, so snapshot reads are fine.
  const node = getStoreNodes().find((entry) => entry.id === nodeId);
  const isVisualizeNode = node?.data.type === 'ai-studio/visualize';
  const sourceId = getStoreEdges().find((edge) => edge.target === nodeId)?.source;

  const selfStatus = useExecutionStore((state) => state.nodeStates[nodeId]?.status);
  const sourceOutput = useExecutionStore((state) => (sourceId ? state.nodeStates[sourceId]?.output : undefined));

  if (!isVisualizeNode || (selfStatus !== 'running' && selfStatus !== 'completed')) {
    return null;
  }

  const text = extractOutputText(sourceOutput);
  const isReady = selfStatus === 'completed' && text.length > 0;

  if (!isReady) {
    return (
      <div className={styles['pending']}>
        <span className={styles['dot']} />
        <span className={styles['dot']} />
        <span className={styles['dot']} />
      </div>
    );
  }

  const modeRaw = (node?.data.properties as { mode?: string } | undefined)?.mode;
  const mode: VisualizeMode = modeRaw && VALID_MODES.has(modeRaw) ? (modeRaw as VisualizeMode) : 'auto';

  const detection = detectFormat(text);
  const activeRenderer: VisualizeRenderer = mode === 'auto' ? detection.renderer : mode;
  const data = mode === 'auto' ? detection.data : undefined;
  const Renderer = getRenderer(activeRenderer);
  const badge = mode === 'auto' ? `Auto › ${RENDERER_LABELS[activeRenderer]}` : RENDERER_LABELS[activeRenderer];

  return (
    <div className={styles['card']}>
      <div className={styles['header']}>
        <Eye className={styles['header-icon']} weight="fill" />
        <span className={styles['header-title']}>Visualize</span>
        <span className={styles['badge']}>{badge}</span>
      </div>
      <div className={styles['body']}>
        <Renderer text={text} data={data} />
      </div>
    </div>
  );
}
