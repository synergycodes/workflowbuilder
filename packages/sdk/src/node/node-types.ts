/**
 * Built-in visual templates the editor ships. A palette item picks one via
 * `NodeDefinition.templateType`, and the editor renders the node with the
 * matching template on the canvas and in the palette preview.
 *
 * Rendering only: `StartNode` styles a node as an entry point but does not
 * make it one. Whether a node starts a workflow is declared separately by
 * {@link NodeData.isStartNode}.
 *
 * @category Types
 */
export enum NodeType {
  Node = 'node',
  StartNode = 'start-node',
  AiNode = 'ai-node',
  DecisionNode = 'decision-node',
}
