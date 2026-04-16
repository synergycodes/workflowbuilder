import type { UISchema, UISchemaElement } from '@/features/json-form/types/uischema';

export const statusOptions = {
  active: { label: 'Active', value: 'active', icon: 'StatusActive' },
  draft: { label: 'Draft', value: 'draft', icon: 'StatusDraft' },
  disabled: { label: 'Disabled', value: 'disabled', icon: 'StatusDisabled' },
} as const;

export const globalControls: UISchemaElement[] = [
  /*
    If you set the node data customErrors, an exclamation mark will be shown on the node,
    and an error message will be displayed in the sidebar.

    data.properties.customErrors = [
      {
        instancePath: '/missingPreviousVariable',
        message: i18n.t('your.custom.message'),
        schemaPath: '',
        keyword: '',
        params: {},
      },
    ];
  */
  {
    type: 'MessageOnError',
    scope: '#/properties/missingPreviousVariable',
    text: 'plugins.validation.missingDependency',
  },
];

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
