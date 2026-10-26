import { FormControlWithLabel } from '@workflowbuilder/sdk';
import type { JsonSchema } from '@workflowbuilder/sdk';

import styles from './decision-record.module.css';

import { EditorForm } from '../../editor-form/editor-form';

type Props = {
  schema: JsonSchema;
  values: Record<string, unknown>;
  reason: string | undefined;
};

/** A decision already made: the values it settled, read-only, and the reason when one was given. */
export function DecisionRecord({ schema, values, reason }: Props) {
  return (
    <div className={styles['record']} data-decision-record>
      {/* A settled decision is not checked again: an emptied or missing field is part of what was decided. */}
      <EditorForm schema={schema} initialData={values} readOnly validate={false} />
      {reason !== undefined && (
        <FormControlWithLabel label="Reason">
          <p className={styles['value']}>{reason}</p>
        </FormControlWithLabel>
      )}
    </div>
  );
}
