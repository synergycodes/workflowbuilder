// About actions: apps/demo/src/app/store/README.md
import {
  migrateLegacyHandleIdsOnEdges,
  migrateLegacyHandleIdsOnNodes,
} from '../../../features/diagram/handles/migrate-legacy-handle-id';
import { selectSingleSelectedElement } from '../../../features/properties-bar/use-single-selected-element';
import type { VariableDefinition } from '../../../features/variables/types';
import type { LayoutDirection } from '../../../node/common';
import type { WorkflowBuilderEdge, WorkflowBuilderNode } from '../../../node/node-data';
import type { IntegrationDataFormat } from '../../../types/integration';
import { getNodeWithErrors } from '../../../utils/validation/get-node-errors';
import { useStore } from '../../store';
import { skipDynamicValuesInEdges, skipDynamicValuesInNodes } from './utils/dynamic-values';

/**
 * One-shot read of the current nodes from the store (outside React).
 * Inside a component prefer `useStore((s) => s.nodes)` so the component
 * re-renders when nodes change.
 *
 * @category Store
 */
export function getStoreNodes() {
  return useStore.getState().nodes;
}

export function getStoreNode(nodeId: string) {
  return useStore.getState().nodes.find((node) => node.id === nodeId);
}

/**
 * Replace all nodes in the store with the given list. Each node is
 * re-validated against its schema before committing — `properties.errors`
 * on the resulting nodes reflects the new validation state.
 *
 * @category Store
 */
export function setStoreNodes(nodes: WorkflowBuilderNode[]) {
  return useStore.setState({ nodes: nodes.map(getNodeWithErrors) });
}

/**
 * One-shot read of the current edges from the store (outside React).
 *
 * @category Store
 */
export function getStoreEdges() {
  return useStore.getState().edges;
}

/**
 * Replace all edges in the store with the given list.
 *
 * @category Store
 */
export function setStoreEdges(edges: WorkflowBuilderEdge[]) {
  return useStore.setState({ edges });
}

/**
 * Read the current diagram layout direction (`'RIGHT'` or `'DOWN'`).
 *
 * @category Store
 */
export function getStoreLayoutDirection() {
  return useStore.getState().layoutDirection;
}

/**
 * Set the diagram layout direction. Re-rendering picks up the new
 * direction without recomputing the layout — call your auto-layout helper
 * after this if positions need to update.
 *
 * @category Store
 */
export function setStoreLayoutDirection(layoutDirection: LayoutDirection) {
  return useStore.setState({ layoutDirection });
}

type GetStoreDataParams = {
  shouldSkipDynamicValues?: boolean;
};

/**
 * Snapshot the diagram in the shape expected by the integration layer
 * (`{ name, nodes, edges, layoutDirection }`). Use this to hand a
 * persistable payload to the host — e.g. inside a `props`-strategy
 * `onDataSave` callback or before posting to a custom backend.
 *
 * Dynamic, runtime-only values (selection, computed avoid-edge points,
 * …) are stripped by default; pass `shouldSkipDynamicValues: false` if
 * you specifically need the live values.
 *
 * @category Store
 */
export function getStoreDataForIntegration(params: GetStoreDataParams = {}): IntegrationDataFormat {
  const { shouldSkipDynamicValues = true } = params;
  const state = useStore.getState();

  return {
    name: state.documentName || '',
    globalVariables: state.globalVariables || {},
    // It removes selected, dynamic points from avoid nodes etc.
    nodes: shouldSkipDynamicValues ? skipDynamicValuesInNodes(state.nodes) : state.nodes,
    edges: shouldSkipDynamicValues ? skipDynamicValuesInEdges(state.edges) : state.edges,
    layoutDirection: state.layoutDirection,
  };
}

export function setStoreDataFromIntegration(loadData: Partial<IntegrationDataFormat>) {
  useStore.setState((state) => ({
    documentName: loadData.name ?? state.documentName,
    globalVariables: loadData.globalVariables || state.globalVariables,
    nodes: (loadData.nodes ? migrateLegacyHandleIdsOnNodes(loadData.nodes) : state.nodes).map(getNodeWithErrors),
    edges: loadData.edges ? migrateLegacyHandleIdsOnEdges(loadData.edges) : state.edges,
    layoutDirection: loadData.layoutDirection ?? state.layoutDirection,
  }));
}

export function getStoreSingleSelected() {
  const state = useStore.getState();

  return selectSingleSelectedElement(state);
}

export function saveVariableDefinition(definition: VariableDefinition) {
  useStore.setState((state) => ({
    globalVariables: {
      ...state.globalVariables,
      [definition.id]: definition,
    },
  }));
}

export function removeVariableDefinition(variableId: string) {
  useStore.setState((state) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { [variableId]: variableToRemove, ...globalVariables } = state.globalVariables;

    return {
      globalVariables,
    };
  });
}
