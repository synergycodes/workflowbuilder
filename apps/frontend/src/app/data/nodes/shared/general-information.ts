import type { UISchema } from '@/features/json-form/types/uischema';

export const statusOptions = {
  active: { label: 'Active', value: 'active', icon: 'StatusActive' },
  draft: { label: 'Draft', value: 'draft', icon: 'StatusDraft' },
  disabled: { label: 'Disabled', value: 'disabled', icon: 'StatusDisabled' },
} as const;

export const generalInformation: UISchema = {
  type: 'Accordion',
  label: 'General Information',
  rule: {
    effect: 'SHOW',
    condition: {
      scope: '#',
      schema: {
        required: ['type'],
      },
    },
  },
  elements: [
    {
      type: 'Text',
      scope: '#/properties/label',
      label: 'Title',
      placeholder: 'Node Title...',
    },
    {
      type: 'Select',
      scope: '#/properties/status',
      options: Object.values(statusOptions),
      label: 'Status',
    },
    {
      type: 'Text',
      scope: '#/properties/description',
      label: 'Description',
      placeholder: 'Type your description here...',
    },
  ],
};
