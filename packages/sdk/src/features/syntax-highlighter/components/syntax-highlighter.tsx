// sort-imports-ignore
import clsx from 'clsx';
import ace, { type Ace } from 'ace-builds';
import { useEffect, useRef } from 'react';
// https://securingsincity.github.io/react-ace/
import AceEditor from 'react-ace';
import 'ace-builds/src-noconflict/ext-language_tools';
import 'ace-builds/src-noconflict/mode-json';
import 'ace-builds/src-noconflict/mode-javascript';
import 'ace-builds/src-noconflict/theme-github_light_default';

import styles from './syntax-highlighter.module.css';

import { useOptionalSdkSurfaces } from '../../../workflow-builder-root/sdk-surfaces';

// react-ace sets the mode before `setOptions`, so `useWorker: false` alone still starts one
// worker per mount, from a blob: URL a Content Security Policy blocks. The default is global.
ace.config.setDefaultValue('session', 'useWorker', false);

type Tooltip = { destroy: () => void };
// Not in Ace's public types; its read-only handler reuses `editor.hoverTooltip` when one is set.
type EditorWithTooltip = Ace.Editor & { hoverTooltip?: Tooltip | null };
const { HoverTooltip } = ace.require('ace/tooltip') as { HoverTooltip: new (parent: HTMLElement) => Tooltip };

export type SyntaxHighlighterProps = {
  value: string;
  onChange?: (value?: string) => void;
  isDisabled?: boolean;
  mode?: string;
};

export function SyntaxHighlighter(props: SyntaxHighlighterProps) {
  const { value, onChange, mode = 'json', isDisabled } = props;
  const editorRef = useRef<EditorWithTooltip | null>(null);
  const portal = useOptionalSdkSurfaces()?.portal;

  // Ace mounts its 'Editing is disabled' tooltip on <body> by default, out of reach of the scoped hide rule.
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || !portal || !isDisabled) return;

    const tooltip = new HoverTooltip(portal);
    editor.hoverTooltip = tooltip;
    return () => {
      // Turning read-only off makes Ace destroy and clear it first.
      if (editor.hoverTooltip !== tooltip) return;
      tooltip.destroy();
      editor.hoverTooltip = null;
    };
  }, [portal, isDisabled]);

  return (
    <div className={clsx(styles['container'])}>
      <AceEditor
        name="field"
        value={value}
        mode={mode}
        theme="github_light_default"
        onChange={onChange}
        onLoad={(editor) => {
          editorRef.current = editor;
        }}
        showPrintMargin={false}
        showGutter={false}
        highlightActiveLine={false}
        wrapEnabled={true}
        readOnly={isDisabled}
        width="100%"
        height="auto"
        fontSize={12}
        style={{
          textIndent: 'none',
          minHeight: '1rem',
          boxSizing: 'border-box',
        }}
        setOptions={{
          fontFamily: "var(--wb-public-font-family-mono, ui-monospace, 'Cascadia Mono', monospace)",
          useWorker: false,
          enableBasicAutocompletion: false,
          enableLiveAutocompletion: false,
          enableSnippets: false,
          enableMobileMenu: false,
          showLineNumbers: false,
          showPrintMargin: false,
          tabSize: 1,
          hasCssTransforms: true,
          $blockScrolling: true,
          maxLines: 10,
        }}
      />
    </div>
  );
}
