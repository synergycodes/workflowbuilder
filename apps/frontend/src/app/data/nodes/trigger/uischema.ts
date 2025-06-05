import { UISchema } from '@/features/json-form/types/uischema';
import { generalInformation } from '../shared/general-information';
import { PaletteItem } from '@workflow-builder/types/common';
import {
  triggerTypeOptions,
  frequencyOptions,
  allDayFrequencyOptions,
  retryIntervalOptions,
  maxRetriesOptions,
  timeoutOptions,
  eventTypeOptions,
  TriggerNodeSchema,
} from './schema';
import { getScope } from '@/features/json-form/utils/get-scope';

const scope = getScope<TriggerNodeSchema>;

const timeBasedTriggerProperties: PaletteItem<TriggerNodeSchema>['uischema'] = {
  rule: {
    effect: 'SHOW',
    condition: {
      scope: scope('properties.type'),
      schema: { const: triggerTypeOptions.time.value },
    },
  },
  type: 'VerticalLayout',
  elements: [
    {
      type: 'Accordion',
      label: 'Trigger Schedule',
      elements: [
        {
          type: 'HorizontalLayout',
          elements: [
            {
              type: 'Label',
              text: 'All Day:',
            },
            {
              type: 'Switch',
              scope: scope('properties.timeSchedule.properties.allDay'),
            },
          ],
        },
        {
          type: 'HorizontalLayout',
          layoutColumns: '1fr 110px 60px',
          elements: [
            {
              type: 'Label',
              text: 'Starts',
            },
            {
              type: 'DatePicker',
              scope: scope('properties.timeSchedule.properties.starts.properties.date'),
            },
            {
              type: 'Text',
              scope: scope('properties.timeSchedule.properties.starts.properties.time'),
              placeholder: '--:--',
              rule: {
                effect: 'SHOW',
                condition: {
                  scope: scope('properties.timeSchedule.properties.allDay'),
                  schema: { const: false },
                },
              },
            },
          ],
        },
        {
          type: 'HorizontalLayout',
          layoutColumns: '1fr 110px 60px',
          elements: [
            {
              type: 'Label',
              text: 'Ends',
            },
            {
              type: 'DatePicker',
              scope: scope('properties.timeSchedule.properties.ends.properties.date'),
            },
            {
              rule: {
                effect: 'SHOW',
                condition: {
                  scope: scope('properties.timeSchedule.properties.allDay'),
                  schema: { const: false },
                },
              },
              type: 'Text',
              scope: scope('properties.timeSchedule.properties.ends.properties.time'),
              placeholder: '--:--',
            },
          ],
        },
        {
          type: 'HorizontalLayout',
          layoutColumns: '1fr 177px',
          elements: [
            { type: 'Label', text: 'Frequency' },
            {
              type: 'Select',
              scope: scope('properties.timeSchedule.properties.frequency'),
              options: frequencyOptions,
              rule: {
                effect: 'SHOW',
                condition: {
                  scope: scope('properties.timeSchedule.properties.allDay'),
                  schema: { const: false },
                },
              },
            },
            {
              type: 'Select',
              scope: scope('properties.timeSchedule.properties.allDayFrequency'),
              options: allDayFrequencyOptions,
              rule: {
                effect: 'SHOW',
                condition: {
                  scope: scope('properties.timeSchedule.properties.allDay'),
                  schema: { const: true },
                },
              },
            },
          ],
        },
      ],
    },
    {
      type: 'Accordion',
      label: 'Retry Settings',
      elements: [
        {
          type: 'HorizontalLayout',
          elements: [
            { type: 'Label', text: 'Retry Interval' },
            {
              type: 'Select',
              scope: scope('properties.retrySettings.properties.interval'),
              options: retryIntervalOptions,
            },
          ],
        },
        {
          type: 'HorizontalLayout',
          elements: [
            { type: 'Label', text: 'Max Retries' },
            {
              type: 'Select',
              scope: scope('properties.retrySettings.properties.retries'),
              options: maxRetriesOptions,
            },
          ],
        },
        {
          type: 'HorizontalLayout',
          elements: [
            { type: 'Label', text: 'Timeout' },
            {
              type: 'Select',
              scope: scope('properties.retrySettings.properties.timeout'),
              options: timeoutOptions,
            },
          ],
        },
      ],
    },
  ],
};

const eventBasedTriggerProperties: PaletteItem<TriggerNodeSchema>['uischema'] = {
  rule: {
    effect: 'SHOW',
    condition: {
      scope: scope('properties.type'),
      schema: { const: triggerTypeOptions.event.value },
    },
  },
  type: 'Accordion',
  label: 'Event-Based Properties',
  elements: [
    {
      type: 'Select',
      label: 'Event Type',
      scope: scope('properties.eventType'),
      options: eventTypeOptions,
    },
  ],
};

export const uischema: UISchema = {
  type: 'VerticalLayout',
  elements: [
    {
      label: 'Trigger Type',
      type: 'Select',
      scope: scope('properties.type'),
    },
    ...(generalInformation ? [generalInformation] : []),
    timeBasedTriggerProperties,
    eventBasedTriggerProperties,
  ],
};
