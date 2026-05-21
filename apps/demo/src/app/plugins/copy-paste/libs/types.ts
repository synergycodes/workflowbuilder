/* eslint-disable @typescript-eslint/no-unsafe-function-type */
import type { Edge, Node } from '@xyflow/react';

export type Selection = {
  nodes: Node[];
  edges: Edge[];
};

export type Position = {
  x: number;
  y: number;
};

export type FlowMousePosition = {
  /** Raw screen coordinates (relative to browser window) */
  screen: Position;
  /**
   * Diagram-space coordinates for absolute positioning with CSS transform
   * These are relative to the diagram container.
   */
  diagram: Position;
  /**
   * Flow-space coordinates (accounting for zoom and pan)
   * These are useful for node placement or data operations (e.g., adding new nodes)
   */
  flow: Position;
  /** Whether mouse is inside the flow */
  isInsideFlow: boolean;
  /** Current zoom level */
  zoom: number;
  /** Current pan offset */
  pan: Position;
};

export type KeyboardHandler = {
  handleCut: Function;
  handleCopy: Function;
  handlePaste: Function;
};

export type GetHandleId = (params: {
  /**
   * The type of handle to get the ID for.
   * Can be 'source' or 'target'.
   */
  type: 'source' | 'target';
  /**
   * The ID of the new node to create.
   */
  newNodeId: string;
  /**
   * The ID of copied node's handle.
   */
  oldHandleId: string | null;
  /**
   * The ID of copied node.
   */
  oldNodeId: string;
}) => string | null;
