import React, { Suspense } from 'react';
import { TextArea } from '@synergycodes/overflow-ui';

import type { SyntaxHighlighterProps } from './syntax-highlighter';

const SyntaxHighlighter = React.lazy(() =>
  import('./syntax-highlighter').then((module) => ({ default: module.SyntaxHighlighter })),
);

type SyntaxHighlighterLazyProps = SyntaxHighlighterProps;

export function SyntaxHighlighterLazy(props: SyntaxHighlighterLazyProps) {
  const { value, onChange, isDisabled } = props;

  return (
    <Suspense
      fallback={
        <TextArea
          value={value}
          onChange={(event) => (onChange ? onChange(event.target.value) : undefined)}
          maxRows={10}
          disabled={isDisabled}
        />
      }
    >
      <SyntaxHighlighter
        value={value}
        onChange={(value) => (onChange ? onChange(value || '') : undefined)}
        isDisabled={isDisabled}
      />
    </Suspense>
  );
}
