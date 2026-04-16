import { Handle, HandleType, Position } from '@xyflow/react';
import clsx from 'clsx';

import styles from './connectable-item.module.css';

import { ExclusiveUnion } from '@/utils/typescript';

import useStore from '@/store/store';

import { getHandleId } from '@/features/diagram/handles/get-handle-id';

type SharedProps = {
  label: string;
  canHaveBottomHandle?: boolean;
};

type PropsForHandleId = {
  handleId: string;
} & SharedProps;

type PropsForHandleConfig = {
  nodeId: string;
  innerId: string;
  handleType: HandleType;
} & SharedProps;

type Props = ExclusiveUnion<PropsForHandleId, PropsForHandleConfig>;

export function ConnectableItem(props: Props) {
  const { label, canHaveBottomHandle = true } = props;
  const layoutDirection = useStore(({ layoutDirection }) => layoutDirection);
  const isVertical = layoutDirection === 'DOWN' && canHaveBottomHandle;
  const position = isVertical ? Position.Bottom : Position.Right;

  const handleId =
    'handleId' in props
      ? props.handleId
      : getHandleId({
          nodeId: props.nodeId,
          innerId: props.innerId,
          handleType: props.handleType,
        });

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
