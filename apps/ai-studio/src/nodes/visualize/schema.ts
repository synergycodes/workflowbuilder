import { sharedProperties } from '@workflowbuilder/sdk';
import type { NodeSchema } from '@workflowbuilder/sdk';

// `auto` lets the node detect the format; the rest force a specific renderer.
const VISUALIZE_MODES = ['auto', 'markdown', 'text', 'json', 'table', 'stat-cards', 'chart', 'diagram'] as const;
type VisualizeMode = (typeof VISUALIZE_MODES)[number];

const MODE_LABELS: Record<VisualizeMode, string> = {
  auto: 'Auto (detect format)',
  markdown: 'Markdown',
  text: 'Plain text',
  json: 'JSON tree',
  table: 'Table',
  'stat-cards': 'Stat cards',
  chart: 'Chart',
  diagram: 'Diagram',
};

export const schema = {
  type: 'object',
  properties: {
    ...sharedProperties,
    mode: {
      type: 'string',
      options: VISUALIZE_MODES.map((value) => ({ label: MODE_LABELS[value], value })),
    },
  },
} satisfies NodeSchema;

export type VisualizeSchema = typeof schema;
