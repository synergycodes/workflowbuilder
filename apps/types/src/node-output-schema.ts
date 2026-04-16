export type OutputProperty = {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  label: string;
  description?: string;
};

export type NodeOutputSchema = {
  properties: Record<string, OutputProperty>;
};
