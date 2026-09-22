import { Input, Switch, TextArea } from '@workflowbuilder/ui';
import type { ReactElement } from 'react';

import styles from './decision-field-input.module.css';

import type { DecisionField } from './decision-fields';

type Props = {
  field: DecisionField;
  value: unknown;
  onChange: (value: unknown) => void;
};

function text(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

// The return type is declared so that a new field kind without a case here fails to compile.
export function DecisionFieldInput({ field, value, onChange }: Props): ReactElement {
  switch (field.kind) {
    case 'number': {
      return (
        <Input
          type="number"
          value={text(value)}
          disabled={field.readOnly}
          onChange={(event) => onChange(event.target.value)}
        />
      );
    }
    case 'boolean': {
      return <Switch checked={value === true} disabled={field.readOnly} onChange={(checked) => onChange(checked)} />;
    }
    case 'text': {
      return (
        <TextArea
          value={text(value)}
          minRows={1}
          maxRows={8}
          disabled={field.readOnly}
          onChange={(event) => onChange(event.target.value)}
        />
      );
    }
    case 'unsupported': {
      return (
        <pre className={styles['read-only-value']}>{value === undefined ? '' : JSON.stringify(value, null, 2)}</pre>
      );
    }
  }
}
