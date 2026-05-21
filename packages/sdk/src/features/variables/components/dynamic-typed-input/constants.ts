import type { SelectItem } from '@synergycodes/overflow-ui';

import type { VariableTypePrimitive } from '../../../../node/node-output-schema';

export const typesForDate: VariableTypePrimitive[] = ['date', 'datetime'];

export const typesForInput: VariableTypePrimitive[] = ['string', 'number'];

export const itemsForBoolean: SelectItem[] = [
  {
    type: 'item',
    label: 'Empty',
    value: '',
  },
  {
    type: 'item',
    label: 'True',
    value: 'true',
  },
  {
    type: 'item',
    label: 'False',
    value: 'false',
  },
];

export const acceptedBooleanValues = itemsForBoolean.map(({ value }) => value);
