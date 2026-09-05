import { ITEMS_FOR_BOOLEAN_VALUES, itemsForBoolean } from '../components/dynamic-typed-input/constants';

export function getBooleanIfPossible(value: string | boolean | undefined): boolean | undefined {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string' && itemsForBoolean.some((option) => option.value === value)) {
    if (value === ITEMS_FOR_BOOLEAN_VALUES.TRUE) {
      return true;
    }

    if (value === ITEMS_FOR_BOOLEAN_VALUES.FALSE) {
      return false;
    }
  }

  return undefined;
}

export function getBooleanStringIfPossible(value: string | boolean | undefined): string | undefined {
  if (typeof value === 'string' && itemsForBoolean.some((option) => option.value === value)) {
    return value;
  }

  if (value === true) {
    return ITEMS_FOR_BOOLEAN_VALUES.TRUE;
  }

  if (value === false) {
    return ITEMS_FOR_BOOLEAN_VALUES.FALSE;
  }

  return ITEMS_FOR_BOOLEAN_VALUES.EMPTY;
}
