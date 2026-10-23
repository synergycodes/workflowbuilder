import type { ReactNode } from 'react';
import type { MentionComponentProps, MentionDataItem, MentionsInputProps } from 'react-mentions-ts';

import type { VariableType } from '@workflow-builder/types/variables';

import type { IconType } from '../../../../node/common';

export type VariableSuggestion = {
  id: string;
  display: string;
  label: string;
  description?: string;
  type: VariableType;
};

export type VariableSuggestionGroup = {
  label?: string;
  icon?: IconType;
  suggestions: VariableSuggestion[];
};

export type VariableTextProps = {
  value: string;
  onChange: (value: string) => void;
  onBlur?: (value: string) => void;
  variant?: 'text' | 'text-area';
  suggestionGroups: VariableSuggestionGroup[];

  className?: string;
  classNameWrapper?: string;

  title?: string;
  renderGroupHeader?: (group: VariableSuggestionGroup) => ReactNode;
  renderGroupItem?: (suggestion: VariableSuggestion, focused: boolean) => ReactNode;

  mentionsInputProps?: Omit<
    MentionsInputProps,
    'value' | 'children' | 'singleLine' | 'classNames' | 'customSuggestionsContainer' | 'onChange' | 'onMentionsChange'
  >;
  mentionProps?: Omit<MentionComponentProps, 'data' | 'displayTransform' | 'renderSuggestion'>;
  hasError?: boolean;
};

export type VariableMentionData = MentionDataItem & {
  groupLabel?: string;
  label: string;
  description?: string;
  type: VariableType;
};
