import clsx from 'clsx';
import { ReactNode } from 'react';

import styles from './node-icon.module.css';

/**
 * Color of a node icon, named by hue. `ai` is a gradient with a white glyph.
 *
 * @category Node
 */
export type NodeIconAccent = 'blue' | 'green' | 'orange' | 'violet' | 'neutral' | 'ai';

export type NodeIconProps = {
  icon: ReactNode;
  /** Tinted container without a border and a glyph in the accent color. Without it the icon keeps the default color. */
  accent?: NodeIconAccent;
  /** Muted glyph and container of the Node Disabled variant. */
  disabled?: boolean;
  className?: string;
};

export function NodeIcon({ icon, accent, disabled = false, className }: NodeIconProps) {
  return (
    <div
      className={clsx(
        styles['container'],
        accent && styles[`accent-${accent}`],
        { [styles['disabled']]: disabled },
        className,
      )}
    >
      {icon}
    </div>
  );
}
