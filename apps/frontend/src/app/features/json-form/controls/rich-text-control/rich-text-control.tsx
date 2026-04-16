import { JsonFormsRendererRegistryEntry, LabelProps } from '@jsonforms/core';
import { withJsonFormsLabelProps } from '@jsonforms/react';

import styles from './rich-text-control.module.css';

import { LabelElement } from '../../types/labels';
import { createTester } from '../../utils/rendering';

function RichTextRendererComponent({ uischema }: LabelProps) {
  const { text } = uischema as LabelElement;

  return <span className={styles.container} dangerouslySetInnerHTML={{ __html: text }} />;
}

export const richTextRenderer: JsonFormsRendererRegistryEntry = {
  renderer: withJsonFormsLabelProps(RichTextRendererComponent),
  tester: createTester('RichText'),
};
