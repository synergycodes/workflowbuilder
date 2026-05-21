import type { VariableDefinition } from '../types';
import { getIsWrongTypeButAcceptable } from './get-is-wrong-type-but-acceptable';
import { getStringType } from './get-string-type';

type DefinitionErrors = {
  [K in keyof VariableDefinition]: boolean;
};

export function getDefinitionErrors(definition: Partial<VariableDefinition>): DefinitionErrors {
  const validity: DefinitionErrors = {
    id: false,
    name: false,
    type: false,
    defaultValue: false,
    description: false,
  };

  if (!definition.id) {
    validity.id = true;
  }

  if (!definition.name) {
    validity.name = true;
  }

  const selectedType = definition.type;
  const defaultValueType = getStringType(definition.defaultValue);

  if (selectedType !== defaultValueType) {
    const isWrongTypeButAcceptable = getIsWrongTypeButAcceptable({
      expectedType: selectedType,
      value: definition.defaultValue,
    });

    if (!isWrongTypeButAcceptable) {
      validity.defaultValue = true;
    }
  }

  return validity;
}
