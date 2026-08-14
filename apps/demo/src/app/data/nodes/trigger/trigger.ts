import type { PaletteItem } from '@workflowbuilder/sdk';

import { defaultPropertiesData } from './default-properties-data';
import { type TriggerNodeSchema, schema } from './schema';
import { uischema } from './uischema';

export const triggerNode: PaletteItem<TriggerNodeSchema> = {
  label: 'node.trigger.label',
  description: 'node.trigger.description',
  type: 'trigger',
  icon: 'Lightning',
  defaultPropertiesData,
  schema,
  uischema,
  outputSchema: {
    type: 'variant',
    variants: [
      {
        variantRule: undefined,
        bySourceHandle: {
          every: {
            eventType: {
              type: 'string',
              label: 'Event Type',
              description: 'The type of event that started the workflow',
            },
            timestamp: {
              type: 'datetime',
              label: 'Timestamp',
              description: 'ISO 8601 date-time when the trigger fired',
            },
          },
        },
      },
      {
        variantRule: {
          dataPropertyName: 'type',
          dataPropertyValue: 'timeBasedTrigger',
        },
        bySourceHandle: {
          success: {
            allDay: {
              type: 'boolean',
              label: 'All day event',
              description: 'The type of event that started the workflow',
            },
            startDate: {
              type: 'datetime',
              label: 'Start date',
              description: 'The date when the event was scheduled to start',
            },
            endDate: {
              type: 'datetime',
              label: 'End date',
              description: 'The date when the event was scheduled to end',
            },
          },
        },
      },
      {
        variantRule: {
          dataPropertyName: 'type',
          dataPropertyValue: 'eventBasedTrigger',
        },
        bySourceHandle: {
          success: {
            typeOfEventType: {
              type: 'string',
              label: 'Type of event type',
              description: 'For example: form submission, user action etc.',
            },
          },
        },
      },
    ],
  },
};

// payload: { type: 'object', label: 'Payload', description: 'The raw event data received by the trigger' },
