import type { HandleType } from '@xyflow/react';

export const INNER_HANDLE_MARKER = 'inner';

type InnerHandleMarker = typeof INNER_HANDLE_MARKER;
type NodeEntityId = string;

type InnerHandleId = `${OuterHandleId}:${InnerHandleMarker}:${NodeEntityId}`;
type OuterHandleId = HandleType;
export type HandleId = InnerHandleId | OuterHandleId;
