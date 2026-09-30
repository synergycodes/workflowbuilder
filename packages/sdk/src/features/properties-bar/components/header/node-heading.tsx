import { NodeIcon, type NodeIconAccent } from '@workflowbuilder/ui';
import clsx from 'clsx';

import { Icon } from '@workflow-builder/icons';

import styles from './node-heading.module.css';

import type { IconType } from '../../../../node/common';

export type NodeHeadingProps = {
  label: string;
  /** Second line under the label, for example the node type. */
  subtitle?: string;
  /** Without it the heading has no icon. */
  icon?: IconType;
  accent?: NodeIconAccent;
  className?: string;
};

export function NodeHeading({ label, subtitle, icon, accent, className }: NodeHeadingProps) {
  return (
    <div className={clsx(styles['container'], className)}>
      {icon && <NodeIcon icon={<Icon name={icon} size="inherit" />} accent={accent} />}
      <div className={styles['text']}>
        {/* Native title until the DS Tooltip takes over; no keyboard or touch access today (follow-up: node-text-ds-tooltip). */}
        <span className={clsx('wb-text-title-s-emphasized', styles['label'])} title={label}>
          {label}
        </span>
        {subtitle && (
          <span className={clsx('wb-text-label-s', styles['subtitle'])} title={subtitle}>
            {subtitle}
          </span>
        )}
      </div>
    </div>
  );
}
