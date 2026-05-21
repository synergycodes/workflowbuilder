/**
 * Built-in template categories the editor recognises. Drives diagram
 * validation rules (e.g. exactly one start node, decision branches),
 * the variable picker's traversal, and rendering choices in the default
 * node template.
 *
 * Custom node types declare their template type via this enum so the
 * editor can apply the matching rules.
 *
 * @category Types
 */
export enum NodeType {
  Node = 'node',
  StartNode = 'start-node',
  AiNode = 'ai-node',
  DecisionNode = 'decision-node',
}
