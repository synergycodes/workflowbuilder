import { NavButton, SnackbarType } from '@workflowbuilder/ui';
import { type ReactElement, type ReactNode, cloneElement, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Mention, type MentionDataItem, MentionsInput } from 'react-mentions-ts';

import { Icon } from '@workflow-builder/icons';

import styles from './variable-text.module.css';

import type { VariableType } from '../../../../node/node-output-schema';
import { showSnackbar } from '../../../../utils/show-snackbar';
import { VARIABLE_BRACKETS_START, VARIABLE_NODES_KEY } from '../../constants';
import type { VariableSuggestion, VariableSuggestionGroup, VariableTextProps } from './variable-text.types';

const DEFAULT_TRIGGER = '{{';
const DEFAULT_MARKUP = '{{__id__}}';
const DEFAULT_TITLE = 'Variables';

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

type VariableMentionData = MentionDataItem & {
  groupLabel?: string;
  label: string;
  description?: string;
  type: VariableType;
};

function buildMentionData(groups: VariableSuggestionGroup[]): VariableMentionData[] {
  return groups.flatMap((group) =>
    group.suggestions.map((suggestion) => ({
      id: suggestion.id,
      display: suggestion.display,
      groupLabel: group.label,
      label: suggestion.label,
      description: suggestion.description,
      type: suggestion.type,
    })),
  );
}

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

function handleClose() {
  if (document.activeElement instanceof HTMLElement) {
    document.activeElement.blur();
  }
}

function SuggestionsContainer({
  groups,
  title,
  renderGroupHeader,
  children,
}: {
  groups: VariableSuggestionGroup[];
  title: string;
  renderGroupHeader: (group: VariableSuggestionGroup) => ReactNode;
  children: ReactElement;
}) {
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
}

export function VariableText({
  className,
  classNameWrapper,
  value,
  onChange,
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
  const singleLine = variant === 'text';

  const mentionData = useMemo(() => buildMentionData(suggestionGroups), [suggestionGroups]);

  const displayTransform = useCallback(
    (id: string | number) => {
      const typedId = String(id);
      const defaultLabel = `{{ ${typedId} }}`;
      const item = mentionData.find((m) => m.id === typedId);

      if (item) {
        return item.display ? `{{ ${item.display} }}` : defaultLabel;
      }

      if (typedId.startsWith(VARIABLE_NODES_KEY)) {
        const nodeId = typedId.replace(`${VARIABLE_NODES_KEY}.`, '').split('.').at(0) || '';
        return `{{ ${t('plugins.validation.missingMentionNodePrefix')} (${nodeId.slice(0, 4)}...) · ${typedId.split('.').at(-1)} }}`;
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
    [suggestionGroups, title, renderGroupHeader],
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
  }, [hasError, singleLine, className]);

  return (
    <MentionsInput
      className={classNameWrapper}
      key={`s-${suggestionGroups.length}-${hasError ? '-e' : ''}`}
      value={value}
      onMentionsChange={onMentionsChange}
      singleLine={singleLine}
      classNames={classNames}
      customSuggestionsContainer={suggestionsContainer}
      {...mentionsInputProps}
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
