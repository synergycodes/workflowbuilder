import { Handle, HandleType, Position } from '@xyflow/react';
import styles from './connectable-item.module.css';
import clsx from 'clsx';
import { getHandleId } from '@/features/diagram/handles/get-handle-id';
import useStore from '@/store/store';

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
    <div className={styles['connectable-item']}>
      {label}
      <div className={clsx(styles['handle-container'], { [styles['vertical']]: isVertical })}>
        <Handle id={handleId} position={position} type="source" />
      </div>
    </div>
  );
}
