import { NodeType } from '../node/node-types';
import { resolveReactFlowNodeType } from './resolve-react-flow-node-type';

describe('resolveReactFlowNodeType', () => {
  it('returns the palette type when a custom template is registered for it', () => {
    const customTemplates = { 'multi-port': () => null };
    expect(resolveReactFlowNodeType('multi-port', NodeType.Node, customTemplates)).toBe('multi-port');
  });

  it('falls back to templateType when no custom template matches', () => {
    expect(resolveReactFlowNodeType('action', NodeType.Node, {})).toBe(NodeType.Node);
  });

  it('falls back to templateType when the palette type is not in the custom templates map', () => {
    const customTemplates = { 'multi-port': () => null };
    expect(resolveReactFlowNodeType('action', NodeType.StartNode, customTemplates)).toBe(NodeType.StartNode);
  });

  it('honors the requested templateType for built-in renderers', () => {
    expect(resolveReactFlowNodeType('ai-agent', NodeType.AiNode, {})).toBe(NodeType.AiNode);
    expect(resolveReactFlowNodeType('decision', NodeType.DecisionNode, {})).toBe(NodeType.DecisionNode);
  });
});
