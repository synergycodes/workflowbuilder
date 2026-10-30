import type { InputProps } from '@workflowbuilder/ui';

import type { VariableTypePrimitive } from '@workflow-builder/types/variables/variables';

import type { BaseControlElement } from '../../../../types/controls';
import type { Override } from '../../../../types/utils';

export type VariableDynamicControlElement = Override<
  BaseControlElement,
  {
    type: 'VariableDynamic';
    variableType: VariableTypePrimitive;
  } & Pick<InputProps, 'placeholder'>
>;
