import { sharedProperties } from '../shared/shared-properties';
import { statusOptions } from '../shared/general-information';
import { NodeSchema, Option } from '@workflow-builder/types/node-schema';

export const eventTypeOptions = [
  { label: 'Form Submission', value: 'formSubmission' },
  { label: 'Record Change', value: 'recordChange' },
  { label: 'API Call', value: 'apiCall' },
  { label: 'User Action', value: 'userAction' },
];

const conditionalRuleOptions = [
  { label: 'Matches Regex', value: 'matchesRegex' },
  { label: 'Does Not Match Regex', value: 'doesNotMatchRegex' },
  { label: 'Is Equal To', value: 'isEqualTo' },
  { label: 'Is Not Equal To', value: 'isNotEqualTo' },
  { label: 'Is Less Than', value: 'isLessThan' },
  { label: 'Is Less Than or Equal To', value: 'isLessThanOrEqualTo' },
  { label: 'Is Greater Than', value: 'isGreaterThan' },
  { label: 'Is Greater Than or Equal To', value: 'isGreaterThanOrEqualTo' },
  { label: 'Contains', value: 'contains' },
  { label: 'Does Not Contain', value: 'doesNotContain' },
  { label: 'Formula is True', value: 'formulaIsTrue' },
  { label: 'Formula is False', value: 'formulaIsFalse' },
];

export const triggerTypeOptions = {
  time: {
    label: 'Time-based Trigger',
    value: 'timeBasedTrigger',
    icon: 'ClockCountdown',
  },
  event: {
    label: 'Event-based Trigger',
    value: 'eventBasedTrigger',
    icon: 'CalendarCheck',
  },
  conditional: {
    label: 'Conditional Trigger',
    value: 'conditionalTrigger',
    icon: 'ListChecks',
  },
  system: {
    label: 'System Trigger',
    value: 'systemTrigger',
    icon: 'Notification',
  },
} as const;

export const frequencyOptions: Option[] = [
  { label: 'None', value: 'none' },
  { label: 'Hourly', value: 'hourly' },
  { label: 'Daily', value: 'daily' },
  { label: 'Weekly', value: 'weekly' },
  { label: 'Monthly', value: 'monthly' },
  { label: 'Yearly', value: 'yearly' },
  { type: 'separator' },
  { label: 'Custom...', value: 'custom' },
];

export const allDayFrequencyOptions = [
  { label: 'None', value: 'none' },
  { label: 'Daily', value: 'daily' },
  { label: 'Weekly', value: 'weekly' },
  { label: 'Monthly', value: 'monthly' },
  { label: 'Yearly', value: 'yearly' },
  { label: 'Custom...', value: 'custom' },
];

export const retryIntervalOptions = [
  { label: 'Every 15 min', value: 'every15min' },
  { label: 'Every 20 min', value: 'every20min' },
  { label: 'Every 30 min', value: 'every30min' },
];

export const maxRetriesOptions = [
  { label: '5', value: '5' },
  { label: '10', value: '10' },
  { label: '15', value: '15' },
];

export const timeoutOptions = [
  { label: '30 min', value: '30Min' },
  { label: '60 min', value: '60Min' },
  { label: '90 min', value: '90Min' },
];

export const schema = {
  properties: {
    ...sharedProperties,
    type: {
      type: 'string',
      options: Object.values(triggerTypeOptions),
      placeholder: 'Select Trigger Type...',
    },
    status: {
      type: 'string',
      options: Object.values(statusOptions),
    },
    timeSchedule: {
      type: 'object',
      properties: {
        allDay: {
          type: 'boolean',
        },
        starts: {
          type: 'object',
          properties: {
            time: {
              type: 'string',
            },
            date: {
              type: 'string',
            },
          },
        },
        ends: {
          type: 'object',
          properties: {
            time: {
              type: 'string',
            },
            date: {
              type: 'string',
            },
          },
        },
        allDayFrequency: {
          type: 'string',
          options: Object.values(allDayFrequencyOptions),
        },
        frequency: {
          type: 'string',
          options: Object.values(frequencyOptions),
        },
      },
    },
    retrySettings: {
      type: 'object',
      properties: {
        interval: {
          type: 'string',
          options: Object.values(retryIntervalOptions),
        },
        retries: {
          type: 'string',
          options: Object.values(maxRetriesOptions),
        },
        timeout: {
          type: 'string',
          options: Object.values(timeoutOptions),
        },
      },
    },
    eventType: {
      type: 'string',
      options: eventTypeOptions,
      placeholder: 'Choose the type of event',
    },
    condition: {
      type: 'object',
      properties: {
        rule: { type: 'string', options: conditionalRuleOptions },
        value: { type: 'string' },
      },
    },
    systemValue: {
      type: 'string',
    },
  },
} satisfies NodeSchema;

export type TriggerNodeSchema = typeof schema;
