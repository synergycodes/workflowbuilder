import clsx from 'clsx';
import { type CSSProperties, ReactNode } from 'react';

import styles from './node-icon.module.css';

/**
 * Color of a node icon, named by hue. `violet-gradient` is a gradient with a white glyph. Any other
 * name reads `--wb-public-node-icon-color-<name>` and `--wb-public-node-icon-container-background-color-<name>`.
 *
 * @category Node
 */
export type NodeIconAccent = 'blue' | 'green' | 'orange' | 'violet' | 'gray' | 'violet-gradient' | (string & {});

// The name is spliced into CSS variable names, so anything else counts as no accent.
const ACCENT_NAME = /^[a-z0-9-]+$/;

export type NodeIconProps = {
  icon: ReactNode;
  /**
   * Tints the container, hides its border and colors the glyph; `disabled` overrides it and
   * keeps the border. Without it the icon keeps the default color.
   */
  accent?: NodeIconAccent;
  /** Muted glyph and container of the Node Disabled variant. */
  disabled?: boolean;
  className?: string;
};

export function NodeIcon({ icon, accent, disabled = false, className }: NodeIconProps) {
  const isAccented = accent !== undefined && ACCENT_NAME.test(accent);

  return (
    <div
      className={clsx(
        styles['container'],
        { [styles['accented']]: isAccented, [styles['disabled']]: disabled },
        className,
      )}
      style={isAccented ? accentStyle(accent) : undefined}
    >
      {icon}
    </div>
  );
}

function accentStyle(accent: string) {
  return {
    '--node-icon-color': `var(--wb-public-node-icon-color-${accent}, var(--wb-public-node-icon-color))`,
    '--node-icon-background': `var(--wb-public-node-icon-container-background-color-${accent}, var(--wb-public-node-icon-container-background-color))`,
  } as CSSProperties;
}
