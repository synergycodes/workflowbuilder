export const delayTypeOptions = {
  fixed: { label: 'Fixed Delay', value: 'fixedDelay', icon: 'Clock' },
  dynamic: {
    label: 'Dynamic Delay',
    value: 'dynamicDelay',
    icon: 'HourglassSimpleHigh',
  },
  conditional: {
    label: 'Conditional Delay',
    value: 'conditionalDelay',
    icon: 'ListChecks',
  },
  untilSpecific: {
    label: 'Until Specific Date/Time',
    value: 'untilSpecificDateTime',
    icon: 'CalendarDot',
  },
} as const;

export const timeUnitsOptions = {
  none: { label: 'None', value: 'none' },
  minutes: { label: 'Minutes', value: 'minutes' },
  hours: { label: 'Hours', value: 'hours' },
} as const;

export const maxWaitTimeOptions = {
  hours24: { label: '24 hours', value: '24' },
  hours12: { label: '12 hours', value: '12' },
  hours8: { label: '8 hours', value: '8' },
  hours4: { label: '4 hours', value: '4' },
  hours2: { label: '2 hours', value: '2' },
} as const;
