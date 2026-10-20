import { generateId } from '../../../../utils/generate-id';
import { getHandleId } from '../../../diagram/handles/get-handle-id';
import type { AiAgentTool } from '../../types/controls';

export function hasAnyValue(data: AiAgentTool): boolean {
  return Object.values(data).some((value) => typeof value === 'string' && value.trim() !== '');
}

export function createAiTool(toolData: AiAgentTool): AiAgentTool {
  const id = generateId();
  const sourceHandle = getHandleId({ innerId: id, handleType: 'source' });

  return { ...toolData, id, sourceHandle };
}
