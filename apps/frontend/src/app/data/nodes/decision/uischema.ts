import { UISchema } from '@/features/json-form/types/uischema';
import { getScope } from '@/features/json-form/utils/get-scope';
import { DecisionNodeSchema } from './schema';

const scope = getScope<DecisionNodeSchema>;

const generalInformation: UISchema = {
  type: 'Accordion',
  label: 'General Settings',
  elements: [
    {
      type: 'Text',
      scope: scope('properties.label'),
      label: 'Title',
      placeholder: 'Node Title...',
    },
    {
      type: 'Text',
      scope: scope('properties.description'),
      label: 'Description',
      placeholder: 'Type your description here...',
    },
    {
      type: 'Select',
      scope: scope('properties.status'),
      label: 'Status',
    },
  ],
} as const;

const decisionSettings: UISchema = {
  type: 'Accordion',
  label: 'Decision Settings',
  elements: [
    {
      type: 'DecisionBranches',
      scope: scope('properties.decisionBranches'),
    },
  ],
} as const;

export const uischema: UISchema = {
  type: 'VerticalLayout',
  elements: [generalInformation, decisionSettings],
};
