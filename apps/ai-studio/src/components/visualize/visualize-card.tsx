import { Eye } from '@phosphor-icons/react';
import { getStoreEdges, getStoreNodes } from '@workflowbuilder/sdk';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import styles from './visualize-card.module.css';

import { useExecutionStore } from '../../stores/use-execution-store';
import { extractOutputText } from '../../utils/extract-output-text';

type Props = {
  props?: {
    nodeId: string;
  };
};

// Rendered on-canvas inside every node via the OptionalNodeContent decorator,
// but only paints for visualize nodes. It reads the upstream node's output
// (resolved through the incoming edge) and renders it in a framed card that
// reveals with an animation once the node finishes. (Renderer set is expanded
// in later steps; for now it renders markdown.)
export function VisualizeCard({ props }: Props) {
  const nodeId = props?.nodeId ?? '';

  // Node vocabulary and edges are static during a run, so snapshot reads are fine.
  const isVisualizeNode = getStoreNodes().find((node) => node.id === nodeId)?.data.type === 'ai-studio/visualize';
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

  return (
    <div className={styles['card']}>
      <div className={styles['header']}>
        <Eye className={styles['header-icon']} weight="fill" />
        <span className={styles['header-title']}>Visualize</span>
      </div>
      <div className={styles['markdown']}>
        <Markdown remarkPlugins={[remarkGfm]}>{text}</Markdown>
      </div>
    </div>
  );
}
