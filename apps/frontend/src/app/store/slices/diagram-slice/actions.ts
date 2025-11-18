// About actions: apps/frontend/src/app/store/README.md
import { IntegrationDataFormat } from '@/features/integration/types';
import useStore from '@/store/store';
import { getNodeWithErrors } from '@/utils/validation/get-node-errors';
import { LayoutDirection } from '@workflow-builder/types/common';
import { WorkflowBuilderEdge, WorkflowBuilderNode } from '@workflow-builder/types/node-data';

export function getStoreNodes() {
  return useStore.getState().nodes;
}

export function getStoreNode(nodeId: string) {
  return useStore.getState().nodes.find((node) => node.id === nodeId);
}

export function setStoreNodes(nodes: WorkflowBuilderNode[]) {
  return useStore.setState({ nodes: nodes.map(getNodeWithErrors) });
}

export function getStoreEdges() {
  return useStore.getState().edges;
}

export function setStoreEdges(edges: WorkflowBuilderEdge[]) {
  return useStore.setState({ edges });
}

export function getStoreLayoutDirection() {
  return useStore.getState().layoutDirection;
}

export function setStoreLayoutDirection(layoutDirection: LayoutDirection) {
  return useStore.setState({ layoutDirection });
}

export function getStoreDataForIntegration(): IntegrationDataFormat {
  const state = useStore.getState();

  return {
    name: state.documentName || '',
    nodes: state.nodes,
    edges: state.edges,
    layoutDirection: state.layoutDirection,
  };
}

export function setStoreDataFromIntegration(loadData: Partial<IntegrationDataFormat>) {
  useStore.setState((state) => ({
    documentName: loadData.name ?? state.documentName,
    nodes: loadData.nodes ?? state.nodes.map(getNodeWithErrors),
    edges: loadData.edges ?? state.edges,
    layoutDirection: loadData.layoutDirection ?? state.layoutDirection,
  }));
}
