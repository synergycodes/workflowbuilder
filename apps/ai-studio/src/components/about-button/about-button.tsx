import { Info } from '@phosphor-icons/react';

import styles from './about-button.module.css';

import { useRightPanelAnchor } from '../../hooks/use-right-panel-anchor';
import { useExecutionStore } from '../../stores/use-execution-store';

type Props = {
  onClick: () => void;
};

// Reopens the intro. It gives way to the log panel and an expanded properties panel, which take its corner.
export function AboutButton({ onClick }: Props) {
  const isLogVisible = useExecutionStore((state) => state.events.length > 0 || state.status !== 'idle');
  const { isPanelExpanded } = useRightPanelAnchor();

  if (isLogVisible || isPanelExpanded) return null;

  return (
    <button className={styles['button']} onClick={onClick} aria-label="About this demo">
      <Info size={20} weight="bold" />
    </button>
  );
}
