import clsx from 'clsx';

import styles from './variable-meta.module.css';

import type { VariableType } from '../../../../node/node-output-schema';
import { variableTypeInfoByType } from '../../constants';

type Props = {
  className?: string;
  name: string;
  type: VariableType;
};

export function VariableMeta({ className = '', name, type }: Props) {
  const typeLabel = variableTypeInfoByType[type]?.label || type;

  return (
    <div className={clsx('ax-public-p10', styles['container'], className)}>
      <span className={styles['name']}>{name}</span>|<span>{typeLabel}</span>
    </div>
  );
}
