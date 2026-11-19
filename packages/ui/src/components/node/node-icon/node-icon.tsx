import clsx from 'clsx';
import { type CSSProperties, ReactNode } from 'react';

import styles from './node-icon.module.css';

import { isCssNamePart } from '../../../shared/utils/css-name';

/**
 * Color of a node icon, named by hue. `violet-gradient` is a gradient with a white glyph. Any other
 * name reads `--wb-public-node-icon-color-<name>` and `--wb-public-node-icon-container-background-color-<name>`.
 *
 * @category Node
 */
export type NodeIconAccent = 'blue' | 'green' | 'orange' | 'violet' | 'gray' | 'violet-gradient' | (string & {});

export type NodeIconProps = {
  icon: ReactNode;
  /**
   * Tints the container and colors the glyph; `disabled` overrides it. Without it the icon keeps
   * the default color.
   */
  accent?: NodeIconAccent;
  /** Muted glyph and container of the Node Disabled variant. */
  disabled?: boolean;
  className?: string;
};

export function NodeIcon({ icon, accent, disabled = false, className }: NodeIconProps) {
  return (
    <div
      className={clsx(styles['container'], { [styles['disabled']]: disabled }, className)}
      style={isCssNamePart(accent) ? accentStyle(accent) : undefined}
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
