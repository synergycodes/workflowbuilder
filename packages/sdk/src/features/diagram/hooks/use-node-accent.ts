import type { NodeIconAccent } from '../../../node/common';
import { useStore } from '../../../store/store';

export function useNodeAccent(nodeType: string): NodeIconAccent | undefined {
  return useStore((store) => store.getNodeDefinition(nodeType)?.accent);
}
