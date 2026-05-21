import clsx from 'clsx';

import styles from './variable-meta.module.css';

import { variableTypeInfoByType } from '../../../../../features/variables/constants';
import type { VariableTypePrimitive } from '../../../../../node/node-output-schema';

type Props = {
  className?: string;
  name: string;
  type: VariableTypePrimitive;
};

export function VariableMeta({ className = '', name, type }: Props) {
  return (
    <div className={clsx('ax-public-p10', styles['container'], className)}>
      <span className={styles['name']}>{name}</span>|<span>{variableTypeInfoByType[type].label}</span>
    </div>
  );
}
