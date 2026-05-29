import { Handle, Position } from '@xyflow/react';
import clsx from 'clsx';

import styles from './connectable-item.module.css';

import { useStore } from '../../../../../store/store';

type Props = {
  handleId: string;
  label: string;
  canHaveBottomHandle?: boolean;
};

export function ConnectableItem({ handleId, label, canHaveBottomHandle = true }: Props) {
  const layoutDirection = useStore(({ layoutDirection }) => layoutDirection);
  const isVertical = layoutDirection === 'DOWN' && canHaveBottomHandle;
  const position = isVertical ? Position.Bottom : Position.Right;

  return (
    <div
      className={clsx(styles['connectable-item'], {
        [styles['connectable-item--right']]: layoutDirection === 'RIGHT',
      })}
    >
      <div className={styles['label']}>{label}</div>
      <div className={clsx(styles['handle-container'], { [styles['vertical']]: isVertical })}>
        <Handle id={handleId} position={position} type="source" />
      </div>
    </div>
  );
}
