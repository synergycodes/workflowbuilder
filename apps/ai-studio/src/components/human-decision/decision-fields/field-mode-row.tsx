import { Select } from '@workflowbuilder/ui';
import type { SelectItem } from '@workflowbuilder/ui';
import clsx from 'clsx';

import styles from './field-mode-row.module.css';

import { FIELD_MODES, type FieldMode, type FieldRow, isFieldMode } from '../../../utils/human-decision/decision-fields';

const MODE_LABELS = {
  hidden: 'Hidden',
  readOnly: 'Read-only',
  editable: 'Editable',
  required: 'Editable, required',
} satisfies Record<FieldMode, string>;

// Fixed items: a mounted Base UI Select resets its value when its items change.
const MODE_ITEMS: SelectItem[] = FIELD_MODES.map((mode) => ({ value: mode, label: MODE_LABELS[mode] }));

type Props = { row: FieldRow; mode: FieldMode; disabled: boolean; onPick: (mode: FieldMode) => void };

export function FieldModeRow({ row, mode, disabled, onPick }: Props) {
  const stale = row.declaration === undefined;
  const label = stale ? `${row.title} (not in the source)` : row.title;
  return (
    <label
      className={clsx(styles['row'], { [styles['row--muted']]: stale || mode === 'hidden' })}
      data-output-field={row.key}
    >
      <span className={styles['label']} title={label}>
        {label}
      </span>
      <span className={styles['select']}>
        <Select
          size="small"
          items={MODE_ITEMS}
          value={mode}
          disabled={disabled}
          // Base UI reports a click on the selected item as a change.
          onChange={(_event, value) => {
            if (isFieldMode(value) && value !== mode) onPick(value);
          }}
        />
      </span>
    </label>
  );
}
