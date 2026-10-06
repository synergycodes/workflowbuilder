import type { NodeSchemaOutput } from '@workflowbuilder/sdk';

export const schemaOutput: NodeSchemaOutput = {
  type: 'variant',
  variants: [
    {
      variantRule: undefined,
      bySourceHandle: {
        every: {
          type: 'object',
          properties: {
            eventType: {
              type: 'string',
              title: 'Event Type',
              description: 'The type of event that started the workflow',
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              title: 'Timestamp',
              description: 'ISO 8601 date-time when the trigger fired',
            },
          },
        },
      },
    },
    {
      variantRule: {
        onlyIfPropertyNameEquals: { path: 'type', value: 'timeBasedTrigger' },
      },
      bySourceHandle: {
        success: {
          type: 'object',
          properties: {
            allDay: {
              type: 'boolean',
              title: 'All day event',
              description: 'The type of event that started the workflow',
            },
            startDate: {
              type: 'string',
              format: 'date-time',
              title: 'Start date',
              description: 'The date when the event was scheduled to start',
            },
            endDate: {
              type: 'string',
              format: 'date-time',
              title: 'End date',
              description: 'The date when the event was scheduled to end',
            },
          },
        },
      },
    },
    {
      variantRule: {
        onlyIfPropertyNameEquals: { path: 'type', value: 'eventBasedTrigger' },
      },
      bySourceHandle: {
        success: {
          type: 'object',
          properties: {
            typeOfEventType: {
              type: 'string',
              title: 'Type of event type',
              description: 'For example: form submission, user action etc.',
            },
          },
        },
      },
    },
  ],
};
