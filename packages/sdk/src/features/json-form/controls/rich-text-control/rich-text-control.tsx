import type { JsonFormsRendererRegistryEntry, LabelProps } from '@jsonforms/core';
import { withJsonFormsLabelProps } from '@jsonforms/react';
import DOMPurify from 'dompurify';

import styles from './rich-text-control.module.css';

import type { LabelElement } from '../../../../types/labels';
import { createTester } from '../../utils/rendering';

const SANITIZE_CONFIG = {
  ALLOWED_TAGS: ['b', 'strong', 'i', 'em', 'u', 's', 'code', 'br', 'a'],
  ALLOWED_ATTR: ['href', 'target', 'rel'],
  ALLOW_DATA_ATTR: false,
  ALLOW_ARIA_ATTR: false,
};

function RichTextRendererComponent({ uischema }: LabelProps) {
  const { text } = uischema as LabelElement;

  return (
    <span
      className={styles.container}
      dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(text ?? '', SANITIZE_CONFIG) }}
    />
  );
}

export const richTextRenderer: JsonFormsRendererRegistryEntry = {
  renderer: withJsonFormsLabelProps(RichTextRendererComponent),
  tester: createTester('RichText'),
};
