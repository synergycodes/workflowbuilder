import { NavButton, SnackbarType } from '@workflowbuilder/ui';
import clsx from 'clsx';
import { type ReactElement, type ReactNode, cloneElement, useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Mention, type MentionDataItem, MentionsInput, type MentionsInputProps } from 'react-mentions-ts';

import { Icon } from '@workflow-builder/icons';

import styles from './variable-text.module.css';

import { getNodeByIdAction } from '../../../../store-get-actions/stores/use-store-get-actions';
import { showSnackbar } from '../../../../utils/show-snackbar';
import { VARIABLE_BRACKETS_START, VARIABLE_NODES_KEY } from '../../constants';
import { buildMentionData } from './core/build-mention-data';
import type {
  VariableMentionData,
  VariableSuggestion,
  VariableSuggestionGroup,
  VariableTextProps,
} from './variable-text.types';

const DEFAULT_TRIGGER = '{{';
const DEFAULT_MARKUP = '{{__id__}}';
const DEFAULT_TITLE = 'Variables';

type MentionsInputBlurHandler = NonNullable<MentionsInputProps['onBlur']>;

const baseClassNames = {
  control: styles['control'],
  input: styles['input'],
  highlighter: styles['highlighter'],
  suggestions: styles['suggestions'],
  suggestionsList: styles['suggestionsList'],
  suggestionItem: styles['suggestionItem'],
  suggestionItemFocused: styles['suggestionItemFocused'],
};

const singleLineClassNames = {
  ...baseClassNames,
  control: `${styles['control']} ${styles['singleLine']}`,
};

const multiLineClassNames = {
  ...baseClassNames,
  control: `${styles['control']} ${styles['multiLine']}`,
};

function defaultRenderGroupItem(suggestion: VariableSuggestion, _focused: boolean): ReactNode {
  return (
    <div className={styles['suggestionContent']}>
      <span className={styles['suggestionLabel']}>{suggestion.label}</span>
      {suggestion.description && <span className={styles['suggestionDescription']}>{suggestion.description}</span>}
    </div>
  );
}

function defaultRenderGroupHeader(group: VariableSuggestionGroup): ReactNode {
  return (
    <>
      {group.icon && (
        <div className={styles['iconWrapper']}>
          <Icon name={group.icon} />
        </div>
      )}
      {group.label}
    </>
  );
}

function preventBlur(event: React.MouseEvent) {
  event.preventDefault();
}

// Prevent mousedown from bubbling to the <ul>, which would set the library's
// _suggestionsMouseDown flag and block subsequent blur-based close.
function stopLibraryMouseDown(event: React.MouseEvent) {
  event.stopPropagation();
}

export function VariableText({
  className,
  classNameWrapper,
  value,
  onChange,
  onBlur,
  variant = 'text',
  suggestionGroups,
  title = DEFAULT_TITLE,
  hasError = false,
  renderGroupHeader = defaultRenderGroupHeader,
  renderGroupItem = defaultRenderGroupItem,
  mentionsInputProps,
  mentionProps,
}: VariableTextProps) {
  const { t } = useTranslation();
  const [key, setKey] = useState(crypto.randomUUID());
  const singleLine = variant === 'text';

  const mentionData = useMemo(() => buildMentionData(suggestionGroups), [suggestionGroups]);

  const handleClose = useCallback(() => {
    setKey(crypto.randomUUID());
  }, []);

  const SuggestionsContainer = useCallback(
    ({
      groups,
      title,
      renderGroupHeader,
      children,
    }: {
      groups: VariableSuggestionGroup[];
      title: string;
      renderGroupHeader: (group: VariableSuggestionGroup) => ReactNode;
      children: ReactElement;
    }) => {
      const ul = children as ReactElement<{ children?: ReactElement[]; className?: string }>;
      const items = ul.props.children;

      if (!items || !Array.isArray(items) || items.length === 0) {
        return children;
      }

      // Build a lookup from suggestion id → group for efficient header injection
      const groupByItemId = new Map<string, VariableSuggestionGroup>();
      for (const group of groups) {
        for (const s of group.suggestions) {
          groupByItemId.set(s.id, group);
        }
      }

      const grouped: ReactNode[] = [];
      let previousLabel = '';

      for (const item of items) {
        // Library keys are formatted as "childIndex-suggestionId", e.g. "0-nodeId.propKey"
        const suggestionId = String(item.key ?? '').replace(/^\d+-/, '');
        const group = groupByItemId.get(suggestionId);
        const label = group?.label ?? '';

        if (label !== previousLabel) {
          const headerGroup = group ?? groups.find((group) => group.label === label);
          if (headerGroup && (headerGroup.label || headerGroup.icon)) {
            grouped.push(
              <li key={`header-${label}`} className={styles['groupHeader']} onMouseDown={stopLibraryMouseDown}>
                {renderGroupHeader(headerGroup)}
              </li>,
            );
          }
          previousLabel = label;
        }

        grouped.push(item);
      }

      return (
        <div className={styles['suggestionsContainer']} onMouseDown={preventBlur}>
          <div className={styles['suggestionsHeader']}>
            <span className={styles['suggestionsTitle']}>{title}</span>
            <NavButton
              onMouseDown={(event: React.MouseEvent) => {
                event.stopPropagation();
                handleClose();
              }}
            >
              <Icon name="X" />
            </NavButton>
          </div>
          {cloneElement(ul, {}, grouped)}
        </div>
      );
    },
    [handleClose],
  );

  const displayTransform = useCallback(
    (id: string | number) => {
      const typedId = String(id);
      const defaultLabel = `{{ ${typedId} }}`;
      const item = mentionData.find((m) => m.id === typedId);

      if (item) {
        return item.display || defaultLabel;
      }

      if (typedId.startsWith(VARIABLE_NODES_KEY)) {
        const nodeId = typedId.replace(`${VARIABLE_NODES_KEY}.`, '').split('.').at(0) || '';

        const node = getNodeByIdAction(nodeId);

        if (node) {
          const nodeLabel = node.data?.properties?.label;

          return `{{ ${nodeLabel ? `${nodeLabel} · ` : ''}${t('variables.missingMentionNodeVariablePrefix')} · ${typedId.split('.').at(-1)} }}`;
        }

        return `{{ ${t('variables.missingMentionNodePrefix')} (${nodeId.slice(0, 4)}...) · ${typedId.split('.').at(-1)} }}`;
      }

      return defaultLabel;
    },
    [mentionData, t],
  );

  const renderSuggestion = useCallback(
    (
      suggestion: MentionDataItem,
      _query: string,
      _highlightedDisplay: ReactNode,
      _index: number,
      focused: boolean,
    ): ReactNode => {
      const data = suggestion as VariableMentionData;
      const variableSuggestion: VariableSuggestion = {
        id: String(data.id),
        display: data.display ?? '',
        label: data.label,
        description: data.description,
        type: data.type,
      };

      return renderGroupItem(variableSuggestion, focused);
    },
    [renderGroupItem],
  );

  const suggestionsContainer = useCallback(
    (children: ReactElement) => (
      <SuggestionsContainer groups={suggestionGroups} title={title} renderGroupHeader={renderGroupHeader}>
        {children}
      </SuggestionsContainer>
    ),
    [SuggestionsContainer, suggestionGroups, title, renderGroupHeader],
  );

  const onMentionsChange = useCallback(
    ({ value }: { value: string }) => {
      if (value.endsWith(VARIABLE_BRACKETS_START) && mentionData.length === 0) {
        showSnackbar({
          title: 'variablesListIsEmpty',
          subtitle: 'variables.variablesListIsEmptyHint',
          variant: SnackbarType.WARNING,
        });
      }

      onChange(value);
    },
    [mentionData.length, onChange],
  );

  const { onBlur: onMentionsInputBlur, ...restMentionsInputProps } = mentionsInputProps ?? {};

  // `event.target.value` holds the display text (labels, "Missing node" placeholders),
  // not the `{{id}}` markup — the controlled `value` prop is the only source of truth.
  const handleBlur = useCallback<MentionsInputBlurHandler>(
    (event) => {
      onMentionsInputBlur?.(event);
      onBlur?.(value);
    },
    [onBlur, onMentionsInputBlur, value],
  );

  const {
    trigger = DEFAULT_TRIGGER,
    markup = DEFAULT_MARKUP,
    appendSpaceOnAdd = true,
    ...restMentionProps
  } = mentionProps ?? {};

  const classNames = useMemo(() => {
    const base = singleLine ? singleLineClassNames : multiLineClassNames;

    let control = base.control;
    if (hasError) {
      control = control + ' ' + styles['control--error'];
    }
    if (className) {
      control = control + ' ' + className;
    }

    return {
      ...base,
      control,
    };
  }, [className, hasError, singleLine]);

  return (
    <MentionsInput
      {...restMentionsInputProps}
      key={key}
      className={clsx(styles['container'], classNameWrapper)}
      value={value}
      onMentionsChange={onMentionsChange}
      onBlur={handleBlur}
      singleLine={singleLine}
      classNames={classNames}
      customSuggestionsContainer={suggestionsContainer}
    >
      <Mention
        trigger={trigger}
        markup={markup}
        data={mentionData}
        displayTransform={displayTransform}
        className={styles['mention']}
        renderSuggestion={renderSuggestion}
        appendSpaceOnAdd={appendSpaceOnAdd}
        {...restMentionProps}
      />
    </MentionsInput>
  );
}
