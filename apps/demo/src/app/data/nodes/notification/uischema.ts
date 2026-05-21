import { generalInformation, getScope, globalControls } from '@workflowbuilder/sdk';
import type { PaletteItem, UISchema } from '@workflowbuilder/sdk';

import { type NotificationNodeSchema, notificationTypeOptions, priorityOptions } from './schema';

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
      type: 'VariableText',
      scope: scope('properties.sendEmail.properties.subject'),
      label: 'Subject',
      placeholder: 'Type your subject here... Use {{ to insert variables',
    },
    {
      type: 'VariableTextArea',
      scope: scope('properties.sendEmail.properties.body'),
      label: 'Email Body',
      placeholder: 'Type your message here... Use {{ to insert variables',
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
    ...globalControls,
    {
      label: 'Select Notification Type',
      type: 'Select',
      scope: scope('properties.type'),
    },
    ...(generalInformation ? [generalInformation] : []),
    sendEmailProperties,
  ],
};
