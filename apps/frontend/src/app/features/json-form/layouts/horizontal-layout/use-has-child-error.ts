import { useJsonForms } from '@jsonforms/react';
import { UISchemaElement } from '../../types/uischema';
import { Scopable, Scoped, toDataPath } from '@jsonforms/core';

export function useHasChildError(childElements?: UISchemaElement[]) {
  const { core } = useJsonForms();
  if (!core?.errors || !childElements?.length) {
    return false;
  }

  const childPaths = childElements
    .filter((element) => (element as Scopable).scope)
    .map((element) => toDataPath((element as Scoped).scope).replace('.', '/'));

  const errorPaths = core.errors.map((error) =>
    error.keyword === 'required' ? `${error.instancePath}/${error.params['missingProperty']}` : error.instancePath,
  );

  return errorPaths.some((errorPath) => childPaths.some((childPath) => errorPath.includes(childPath)));
}
