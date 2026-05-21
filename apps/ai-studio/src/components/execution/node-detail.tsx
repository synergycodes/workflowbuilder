import { X } from '@phosphor-icons/react';

import styles from './node-detail.module.css';

import { selectNode, useExecutionStore } from '../../stores/use-execution-store';
import { extractOutputText } from '../../utils/extract-output-text';

export function ExecutionNodeDetail() {
  const selectedNodeId = useExecutionStore((s) => s.selectedNodeId);
  const nodeState = useExecutionStore((s) => (s.selectedNodeId ? s.nodeStates[s.selectedNodeId] : undefined));

  if (!selectedNodeId || !nodeState) return null;
  if (nodeState.status !== 'completed' && nodeState.status !== 'failed') return null;

  const outputText =
    nodeState.status === 'completed'
      ? extractOutputText(nodeState.output) || '(no output)'
      : (nodeState.error?.message ?? '(no error message)');

  return (
    <div className={styles['overlay']}>
      <div className={styles['header']}>
        <span className={styles['header-title']}>{selectedNodeId}</span>
        <span className={`${styles['status']} ${styles[`status--${nodeState.status}`]}`}>{nodeState.status}</span>
        <button className={styles['close-button']} onClick={() => selectNode(null)} type="button" aria-label="Close">
          <X weight="bold" />
        </button>
      </div>
      <div className={styles['body']}>
        <pre className={styles['output']}>{outputText}</pre>
      </div>
    </div>
  );
}
