import type { PropsWithChildren } from 'react';

import styles from './node-section.module.css';

type Props = PropsWithChildren<{ label: string }>;

/**
 * Visually-grouped container used inside custom node bodies — renders a
 * header label above its children with the editor's section spacing and
 * border tokens.
 *
 * Reach for it when authoring a node template that needs to split its
 * content into named sub-blocks (e.g. "Inputs", "Settings").
 *
 * @category Components
 */
export function NodeSection({ label, children }: Props) {
  return (
    <div className={styles['container']}>
      {label && <span>{label}</span>}
      {children}
    </div>
  );
}
