import { getSubErrorsAt } from '@jsonforms/core';
import { useJsonForms } from '@jsonforms/react';
import type { ErrorObject } from 'ajv';
import { useMemo } from 'react';

import { getIsStringNumber } from '../../../utils/validation/get-is-string-number';

type Response = {
  hasArrayErrors: boolean;
  [index: number]: ErrorObject<string>[] | undefined;
};

export function useArrayError(instancePath: string): Response {
  // https://jsonforms.discourse.group/t/displaying-nested-errors/2416/3
  const jsonforms = useJsonForms();

  const errorsByIndex = useMemo(() => {
    const childErrors = getSubErrorsAt(instancePath, {} /* schema is expected but not needed */)({ jsonforms });

    return childErrors.reduce(
      (stack: Response, childError) => {
        const potentialIndex = childError.instancePath.split('/').at(-1);

        const isNumeric = getIsStringNumber(potentialIndex);
        if (isNumeric) {
          stack.hasArrayErrors = true;
          const index = Number(potentialIndex);
          stack[index] = [...(stack[index] || []), childError];
        }

        return stack;
      },
      {
        hasArrayErrors: false,
      },
    );
  }, [instancePath, jsonforms]);

  return errorsByIndex;
}
