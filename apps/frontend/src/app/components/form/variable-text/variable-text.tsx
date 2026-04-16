import { NavButton } from '@synergycodes/overflow-ui';
import { ReactElement, ReactNode, cloneElement, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Mention, MentionDataItem, MentionsInput } from 'react-mentions-ts';

import { Icon } from '@workflow-builder/icons';

import styles from './variable-text.module.css';

import { VARIABLE_NODES_KEY } from './constants';
import { VariableSuggestion, VariableSuggestionGroup, VariableTextProps } from './variable-text.types';

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
  nodeLabel?: string;
  propertyLabel: string;
  description?: string;
};

function buildMentionData(groups: VariableSuggestionGroup[]): VariableMentionData[] {
  return groups.flatMap((group) =>
    group.suggestions.map((s) => ({
      id: s.id,
      display: s.display,
      nodeLabel: group.nodeLabel,
      propertyLabel: s.propertyLabel,
      description: s.description,
    })),
  );
}

function defaultRenderGroupItem(suggestion: VariableSuggestion, _focused: boolean): ReactNode {
  return (
    <div className={styles['suggestionContent']}>
      <span className={styles['suggestionLabel']}>{suggestion.propertyLabel}</span>
      {suggestion.description && <span className={styles['suggestionDescription']}>{suggestion.description}</span>}
    </div>
  );
}

function defaultRenderGroupHeader(group: VariableSuggestionGroup): ReactNode {
  return (
    <>
      {group.nodeIcon && (
        <div className={styles['iconWrapper']}>
          <Icon name={group.nodeIcon} />
        </div>
      )}
      {group.nodeLabel}
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
  let lastNodeLabel = '';

  for (const item of items) {
    // Library keys are formatted as "childIndex-suggestionId", e.g. "0-nodeId.propKey"
    const suggestionId = String(item.key ?? '').replace(/^\d+-/, '');
    const group = groupByItemId.get(suggestionId);
    const nodeLabel = group?.nodeLabel ?? '';

    if (nodeLabel !== lastNodeLabel) {
      const headerGroup = group ?? groups.find((g) => g.nodeLabel === nodeLabel);
      if (headerGroup && (headerGroup.nodeLabel || headerGroup.nodeIcon)) {
        grouped.push(
          <li key={`header-${nodeLabel}`} className={styles['groupHeader']} onMouseDown={stopLibraryMouseDown}>
            {renderGroupHeader(headerGroup)}
          </li>,
        );
      }
      lastNodeLabel = nodeLabel;
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
        propertyLabel: data.propertyLabel,
        description: data.description,
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

  function onMentionsChange({ value }: { value: string }) {
    onChange(value);
  }

  const {
    trigger = DEFAULT_TRIGGER,
    markup = DEFAULT_MARKUP,
    appendSpaceOnAdd = true,
    ...restMentionProps
  } = mentionProps ?? {};

  const classNames = useMemo(() => {
    const base = singleLine ? singleLineClassNames : multiLineClassNames;

    return {
      ...base,
      ...(hasError ? { control: `${base.control} ${styles['control--error']}` } : {}),
    };
  }, [hasError, singleLine]);

  return (
    <MentionsInput
      value={value}
      onChange={() => {}}
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
