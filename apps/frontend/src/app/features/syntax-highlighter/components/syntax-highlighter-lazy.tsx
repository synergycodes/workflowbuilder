import { TextArea } from '@synergycodes/overflow-ui';
import React, { Suspense } from 'react';

import type { SyntaxHighlighterProps } from './syntax-highlighter';

const SyntaxHighlighter = React.lazy(() =>
  import('./syntax-highlighter').then((module) => ({ default: module.SyntaxHighlighter })),
);

type SyntaxHighlighterLazyProps = SyntaxHighlighterProps;

export function SyntaxHighlighterLazy(props: SyntaxHighlighterLazyProps) {
  const { value, onChange, mode, isDisabled } = props;

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
        mode={mode}
        onChange={(value) => (onChange ? onChange(value || '') : undefined)}
        isDisabled={isDisabled}
      />
    </Suspense>
  );
}
