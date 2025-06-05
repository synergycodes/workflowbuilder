import { HandleType } from '@xyflow/react';
import { HandleId } from './types';

export function getHandleId({ handleType, nodeId, innerId }: GetHandleIdOptions): HandleId {
  const idBase = `${nodeId}:${handleType}` as const;

  if (!innerId) {
    return idBase;
  }

  return `${idBase}:inner:${innerId}`;
}

type GetHandleIdOptions = {
  nodeId: string;
  handleType: HandleType;
  innerId?: string;
};
