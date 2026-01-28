import { Handle, HandleType, Position } from '@xyflow/react';
import clsx from 'clsx';

import styles from './connectable-item.module.css';

import useStore from '@/store/store';

import { getHandleId } from '@/features/diagram/handles/get-handle-id';

type Props = {
  nodeId: string;
  innerId: string;
  handleType: HandleType;
  label: string;
  canHaveBottomHandle?: boolean;
};

export function ConnectableItem({ label, nodeId, innerId, handleType, canHaveBottomHandle = true }: Props) {
  const layoutDirection = useStore(({ layoutDirection }) => layoutDirection);
  const isVertical = layoutDirection === 'DOWN' && canHaveBottomHandle;
  const position = isVertical ? Position.Bottom : Position.Right;

  const handleId = getHandleId({ nodeId, innerId, handleType });

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
