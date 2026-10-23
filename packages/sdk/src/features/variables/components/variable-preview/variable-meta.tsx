import clsx from 'clsx';

import type { VariableType } from '@workflow-builder/types/node-output-schema';

import styles from './variable-meta.module.css';

import { variableTypeInfoByType } from '../../constants';

type Props = {
  className?: string;
  name: string;
  type: VariableType;
};

export function VariableMeta({ className = '', name, type }: Props) {
  const typeLabel = variableTypeInfoByType[type]?.label || type;

  return (
    <div className={clsx('wb-text-body-s', styles['container'], className)}>
      <span className={styles['name']}>{name}</span>|<span>{typeLabel}</span>
    </div>
  );
}
