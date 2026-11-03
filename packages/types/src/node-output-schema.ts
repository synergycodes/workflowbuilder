export type VariableTypePrimitive = 'string' | 'number' | 'boolean' | 'datetime' | 'date';

export type VariableType = VariableTypePrimitive | 'object' | 'array';

export function getVariableTypeIfPrimitive(type: VariableType): VariableTypePrimitive | undefined {
  if (type === 'object' || type === 'array') {
    return;
  }

  return type;
}

export type OutputProperty = {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  label: string;
  description?: string;
};

export type NodeOutputSchema = {
  properties: Record<string, OutputProperty>;
};
