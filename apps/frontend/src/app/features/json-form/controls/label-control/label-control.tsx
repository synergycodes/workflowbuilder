import { JsonFormsRendererRegistryEntry, LabelProps } from '@jsonforms/core';
import { withJsonFormsLabelProps } from '@jsonforms/react';

import { Label } from '@/components/form/label/label';

import { LabelElement } from '../../types/label';
import { createTester } from '../../utils/rendering';

function LabelRendererComponent({ uischema }: LabelProps) {
  const { text, size, required } = uischema as LabelElement;

  return <Label label={text} size={size} required={required} />;
}

export const labelRenderer: JsonFormsRendererRegistryEntry = {
  renderer: withJsonFormsLabelProps(LabelRendererComponent),
  tester: createTester('Label'),
};
