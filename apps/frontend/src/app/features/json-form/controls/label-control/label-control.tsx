import { JsonFormsRendererRegistryEntry, LabelProps } from '@jsonforms/core';
import { LabelElement } from '../../types/label';
import { withJsonFormsLabelProps } from '@jsonforms/react';
import { createTester } from '../../utils/rendering';
import { Label } from '@/components/form/label/label';

function LabelRendererComponent({ uischema }: LabelProps) {
  const { text, size, required } = uischema as LabelElement;

  return <Label label={text} size={size} required={required} />;
}

export const labelRenderer: JsonFormsRendererRegistryEntry = {
  renderer: withJsonFormsLabelProps(LabelRendererComponent),
  tester: createTester('Label'),
};
