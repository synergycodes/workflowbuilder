import { UISchema } from '@/features/json-form/types/uischema';
import { generalInformation } from '../shared/general-information';
import { NotificationNodeSchema, notificationTypeOptions, priorityOptions } from './schema';
import { PaletteItem } from '@workflow-builder/types/common';
import { getScope } from '@/features/json-form/utils/get-scope';

const scope = getScope<NotificationNodeSchema>;

const sendEmailProperties: PaletteItem<NotificationNodeSchema>['uischema'] = {
  rule: {
    effect: 'SHOW',
    condition: {
      scope: scope('properties.type'),
      schema: { const: notificationTypeOptions.email.value },
    },
  },
  type: 'Accordion',
  label: 'Email Settings',
  elements: [
    {
      type: 'Text',
      scope: scope('properties.sendEmail.properties.address'),
      label: 'Send To',
      placeholder: 'user@example.com',
    },
    {
      type: 'Text',
      scope: scope('properties.sendEmail.properties.copy'),
      label: 'CC / BCC',
      placeholder: 'manager@example.com',
    },
    {
      type: 'Text',
      scope: scope('properties.sendEmail.properties.subject'),
      label: 'Subject',
      placeholder: 'Type your subject here...',
    },
    {
      type: 'TextArea',
      scope: scope('properties.sendEmail.properties.body'),
      label: 'Email Body',
      placeholder: 'Type your message here...',
      minRows: 5,
    },
    {
      type: 'Select',
      scope: scope('properties.sendEmail.properties.priority'),
      label: 'Priority',
      options: priorityOptions,
    },
    {
      type: 'HorizontalLayout',
      elements: [
        {
          type: 'Label',
          text: 'Retry on Failure:',
        },
        {
          type: 'Switch',
          scope: scope('properties.sendEmail.properties.retryOnFailure'),
        },
      ],
    },
    {
      type: 'HorizontalLayout',
      elements: [
        { type: 'Label', text: 'Number of retries' },
        {
          type: 'Text',
          scope: scope('properties.sendEmail.properties.retries'),
          rule: {
            effect: 'DISABLE',
            condition: {
              scope: scope('properties.sendEmail.properties.retryOnFailure'),
              schema: { const: false },
            },
          },
        },
      ],
    },
  ],
};

export const uischema: UISchema = {
  type: 'VerticalLayout',
  elements: [
    {
      label: 'Select Notification Type',
      type: 'Select',
      scope: scope('properties.type'),
    },
    ...(generalInformation ? [generalInformation] : []),
    sendEmailProperties,
  ],
};
