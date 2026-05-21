import type { JsonFormsRendererRegistryEntry, LabelProps } from '@jsonforms/core';
import { withJsonFormsLabelProps } from '@jsonforms/react';

import { Label } from '../../../../components/form/label/label';
import type { LabelElement } from '../../../../types/labels';
import { createTester } from '../../utils/rendering';

function LabelRendererComponent({ uischema }: LabelProps) {
  const { text, size, required, variant } = uischema as LabelElement;

  return <Label label={text} size={size} required={required} variant={variant} />;
}

export const labelRenderer: JsonFormsRendererRegistryEntry = {
  renderer: withJsonFormsLabelProps(LabelRendererComponent),
  tester: createTester('Label'),
};
