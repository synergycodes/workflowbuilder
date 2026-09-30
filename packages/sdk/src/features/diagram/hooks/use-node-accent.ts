import type { NodeIconAccent } from '@workflowbuilder/ui';

import { useStore } from '../../../store/store';

export function useNodeAccent(nodeType: string): NodeIconAccent | undefined {
  return useStore((store) => store.getNodeDefinition(nodeType)?.accent);
}
