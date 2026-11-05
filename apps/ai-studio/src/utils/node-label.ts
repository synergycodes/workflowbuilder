type NodesState = { nodes: { id: string; data: { properties: { label?: unknown } } }[] };

/** The node's label, or its id when it has none. */
export function nodeLabel(state: NodesState, nodeId: string) {
  const label = state.nodes.find((node) => node.id === nodeId)?.data.properties.label;
  return typeof label === 'string' && label ? label : nodeId;
}
