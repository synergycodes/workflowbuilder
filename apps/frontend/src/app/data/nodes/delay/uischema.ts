import { UISchema } from '@/features/json-form/types/uischema';
import { generalInformation } from '../shared/general-information';
import { PaletteItem } from '@workflow-builder/types/common';
import { DelayNodeSchema } from './schema';
import { getScope } from '@/features/json-form/utils/get-scope';
import { delayTypeOptions } from './select-options';

const scope = getScope<DelayNodeSchema>;

const fixedDelayProperties: PaletteItem<DelayNodeSchema>['uischema'] = {
  rule: {
    effect: 'SHOW',
    condition: {
      scope: scope('properties.type'),
      schema: { const: delayTypeOptions.fixed.value },
    },
  },
  type: 'Accordion',
  label: 'Duration',
  elements: [
    {
      type: 'VerticalLayout',
      elements: [
        {
          type: 'HorizontalLayout',
          elements: [
            {
              type: 'Label',
              text: 'Time Units:',
            },
            {
              type: 'Select',
              scope: scope('properties.duration.properties.timeUnits'),
            },
          ],
        },
        {
          type: 'HorizontalLayout',
          elements: [
            {
              type: 'Label',
              text: 'Delay Amount:',
              required: true /* This should be handled automatically by the required: [] field in the schema. */,
            },
            {
              type: 'Text',
              scope: scope('properties.duration.properties.delayAmount'),
              errorIndicatorEnabled: false,
            },
          ],
        },
      ],
    },
  ],
};

const dynamicDelayProperties: PaletteItem<DelayNodeSchema>['uischema'] = {
  rule: {
    effect: 'SHOW',
    condition: {
      scope: scope('properties.type'),
      schema: { const: delayTypeOptions.dynamic.value },
    },
  },
  type: 'Accordion',
  label: 'Duration',
  elements: [
    {
      type: 'VerticalLayout',
      elements: [
        {
          type: 'Text',
          scope: scope('properties.duration.properties.expression'),
          label: 'Duration Expression',
        },
        {
          type: 'HorizontalLayout',
          elements: [
            {
              type: 'Label',
              text: 'Max Wait Time:',
            },
            {
              type: 'Select',
              scope: scope('properties.duration.properties.maxWaitTime'),
            },
          ],
        },
      ],
    },
  ],
};

export const uischema: UISchema = {
  type: 'VerticalLayout',
  elements: [
    {
      label: 'Delay Type',
      type: 'Select',
      scope: scope('properties.type'),
    },
    ...(generalInformation ? [generalInformation] : []),
    fixedDelayProperties,
    dynamicDelayProperties,
  ],
};
