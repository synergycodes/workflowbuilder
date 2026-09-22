import { FormControlWithLabel } from '@workflowbuilder/sdk';
import { useState } from 'react';

import styles from './decision-form.module.css';

import { DecisionFieldInput } from './decision-field-input';
import type { DecisionField } from './decision-fields';
import type { DecisionValues } from './decision-values';

type Props = {
  fields: DecisionField[];
  initialValues: DecisionValues;
};

// Owns the person's values. The control remounts it (React `key`) when the node or the wait changes: that is the reset.
export function DecisionForm({ fields, initialValues }: Props) {
  const [values, setValues] = useState(initialValues);

  if (fields.length === 0) {
    return <p className={styles['empty']}>This request has no fields to review.</p>;
  }

  return (
    <div className={styles['form']} data-decision-form>
      {fields.map((field) => (
        <div key={field.key} data-decision-field={field.key}>
          <FormControlWithLabel label={field.label} required={field.required}>
            <DecisionFieldInput
              field={field}
              value={values[field.key]}
              onChange={(value) => setValues((current) => ({ ...current, [field.key]: value }))}
            />
          </FormControlWithLabel>
        </div>
      ))}
    </div>
  );
}
