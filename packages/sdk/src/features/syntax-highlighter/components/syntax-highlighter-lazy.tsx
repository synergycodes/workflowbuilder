import { TextArea } from '@workflowbuilder/ui';
import React, { Suspense } from 'react';

import type { SyntaxHighlighterProps } from './syntax-highlighter';

const SyntaxHighlighter = React.lazy(() =>
  import('./syntax-highlighter').then((module) => ({ default: module.SyntaxHighlighter })),
);

type SyntaxHighlighterLazyProps = SyntaxHighlighterProps;

/**
 * Code-editor input with syntax highlighting. Lazy-loads the heavy
 * `ace-builds` chunk — until it arrives, falls back to a plain `<TextArea>`
 * so the consumer never sees a blank tile during the load.
 *
 * Use it inside custom JsonForms renderers when a property accepts code
 * (JSON, JS expressions, etc.). Pass `mode` to pick the highlighter
 * grammar (`'json'`, `'javascript'`, …) and `value` / `onChange` to wire
 * it to your form state.
 *
 * @category Components
 */
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
