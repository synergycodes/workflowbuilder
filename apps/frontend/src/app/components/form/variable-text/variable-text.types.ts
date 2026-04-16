import { ReactNode } from 'react';
import { MentionComponentProps, MentionsInputProps } from 'react-mentions-ts';

import { IconType } from '@workflow-builder/types/common';

export type VariableSuggestion = {
  id: string;
  display: string;
  propertyLabel: string;
  description?: string;
};

export type VariableSuggestionGroup = {
  nodeLabel?: string;
  nodeIcon?: IconType;
  suggestions: VariableSuggestion[];
};

export type VariableTextProps = {
  value: string;
  onChange: (value: string) => void;
  variant?: 'text' | 'text-area';
  suggestionGroups: VariableSuggestionGroup[];

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
