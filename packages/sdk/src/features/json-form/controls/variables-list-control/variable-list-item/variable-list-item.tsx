import { Trash } from '@phosphor-icons/react';
import { Collapsible, Input, NavButton } from '@workflowbuilder/ui';
import type { ErrorObject } from 'ajv';
import clsx from 'clsx';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Icon } from '@workflow-builder/icons';

import styles from './variable-list-item.module.css';

import { FormControlWithLabel } from '../../../../../components/form/form-control-with-label/form-control-with-label';
import type { HandleItemMove } from '../../../../../utils/reorder';
import { VariableSelect } from '../../../../variables/components/variable-select/variable-select';
import type { VariableSuggestionGroup } from '../../../../variables/components/variable-text/variable-text.types';

type Props = {
  label: string;
  reference: string;
  suggestionGroups: VariableSuggestionGroup[];
  index: number;
  onUpdateReference: (index: number, reference: string) => void;
  onUpdateLabel: (index: number, label: string) => void;
  onRemove: (index: number) => void;
  enabled?: boolean;
  onMove?: HandleItemMove;
  isFirst: boolean;
  isLast: boolean;
  errors: ErrorObject<string>[] | undefined;
};

export function VariableListItem({
  label,
  reference,
  suggestionGroups,
  index,
  onUpdateReference,
  onUpdateLabel,
  onRemove,
  enabled = true,
  isFirst,
  isLast,
  onMove,
  errors = [],
}: Props) {
  const hasErrors = errors.length > 0;
  const [isExpanded, setIsExpanded] = useState(reference === '' || label === '' || hasErrors);
  const { t } = useTranslation();

  const onReferenceChange = useCallback(
    (value: string) => {
      onUpdateReference(index, value);
    },
    [onUpdateReference, index],
  );

  const onLabelChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      onUpdateLabel(index, event.target.value);
    },
    [onUpdateLabel, index],
  );

  const onClickRemove = useCallback(() => onRemove(index), [onRemove, index]);

  const handleMove: HandleItemMove = useCallback(
    (event, index, direction) => {
      event.preventDefault();

      if (onMove) {
        onMove(event, index, direction);
      }
    },
    [onMove],
  );

  const hasItemsAboveOrBelow = !isFirst || !isLast;
  const navSize = hasItemsAboveOrBelow ? 'xxs' : 's';
  const title = label || reference || t('variablesList.variableIndex', { index: index + 1 });

  return (
    <Collapsible isExpanded={isExpanded}>
      <div
        className={clsx(styles['variable-card'], {
          [styles['variable-card--collapsed']]: !isExpanded,
          [styles['variable-card--expanded']]: isExpanded,
          [styles['variable-card--error']]: hasErrors,
        })}
      >
        <div className={styles['header']}>
          {!isExpanded && (
            <button className={styles['button-expand']} onClick={() => setIsExpanded(!isExpanded)}>
              <span className={styles['sr-only']}>{t('common.expand')}</span>
            </button>
          )}
          <button
            className={clsx('wb-text-body-s-emphasized', styles['title'])}
            onClick={() => setIsExpanded(!isExpanded)}
          >
            <span>{title}</span>
          </button>
          <div className={styles['actions']}>
            <NavButton className={styles['button-remove']} size={navSize} onClick={onClickRemove} disabled={!enabled}>
              <Trash weight="bold" />
            </NavButton>
            {hasItemsAboveOrBelow && (
              <div className={styles['arrows']}>
                {!isFirst && onMove && (
                  <NavButton
                    size={navSize}
                    onClick={(event) => handleMove(event, index, 'up')}
                    tooltip={t('common.moveUp')}
                    disabled={!enabled}
                  >
                    <Icon name="ArrowUp" size="small" />
                  </NavButton>
                )}
                {!isLast && onMove && (
                  <NavButton
                    size={navSize}
                    onClick={(event) => handleMove(event, index, 'down')}
                    tooltip={t('common.moveDown')}
                    disabled={!enabled}
                  >
                    <Icon name="ArrowDown" size="small" />
                  </NavButton>
                )}
              </div>
            )}
          </div>
        </div>
        <Collapsible.Content>
          <div className={styles['content']}>
            <FormControlWithLabel label="variablesList.variable">
              <VariableSelect
                value={reference}
                onChange={onReferenceChange}
                variant="text"
                suggestionGroups={suggestionGroups}
                hasError={hasErrors}
                mentionsInputProps={{ disabled: !enabled }}
              />
            </FormControlWithLabel>
            <FormControlWithLabel label="variablesList.label">
              <Input
                value={label}
                placeholder={t('variablesList.variableIndex', { index: index + 1 })}
                onChange={onLabelChange}
                disabled={!enabled}
              />
            </FormControlWithLabel>
          </div>
        </Collapsible.Content>
      </div>
    </Collapsible>
  );
}
