import type { SelectItem } from '@workflowbuilder/ui';

import type { VariableType } from '@workflow-builder/types/node-output-schema';

export const typesForDate: VariableType[] = ['date', 'datetime'];

export const typesForInput: VariableType[] = ['string', 'number'];

export const ITEMS_FOR_BOOLEAN_VALUES = {
  TRUE: 'true',
  FALSE: 'false',
  EMPTY: '',
} as const;

export const itemsForBoolean: SelectItem[] = [
  {
    type: 'item',
    label: ' ', // Empty space
    value: ITEMS_FOR_BOOLEAN_VALUES.EMPTY,
  },
  {
    type: 'item',
    label: 'True',
    value: ITEMS_FOR_BOOLEAN_VALUES.TRUE,
  },
  {
    type: 'item',
    label: 'False',
    value: ITEMS_FOR_BOOLEAN_VALUES.FALSE,
  },
];

export const acceptedBooleanValues = itemsForBoolean.map(({ value }) => value);
