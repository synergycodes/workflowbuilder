import type { HandleType } from '@xyflow/react';

import type { HandleId } from './types';

export function getHandleId({ handleType, innerId }: GetHandleIdOptions): HandleId {
  if (!innerId) {
    return handleType;
  }

  return `${handleType}:inner:${innerId}`;
}

type GetHandleIdOptions = {
  handleType: HandleType;
  innerId?: string;
};
