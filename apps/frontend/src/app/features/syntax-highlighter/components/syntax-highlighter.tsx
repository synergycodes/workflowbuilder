import clsx from 'clsx';

import AceEditor from 'react-ace';

// https://securingsincity.github.io/react-ace/

import 'ace-builds/src-noconflict/mode-json';
import 'ace-builds/src-noconflict/ext-language_tools';
import 'ace-builds/src-noconflict/theme-github_light_default';

import styles from './syntax-highlighter.module.css';

export type SyntaxHighlighterProps = {
  value: string;
  onChange?: (value?: string) => void;
  isDisabled?: boolean;
};

export function SyntaxHighlighter(props: SyntaxHighlighterProps) {
  const { value, onChange, isDisabled } = props;

  return (
    <div className={clsx(styles['container'])}>
      <AceEditor
        name="field"
        value={value}
        mode="json"
        theme="github_light_default"
        onChange={onChange}
        fontSize={12}
        lineHeight={16}
        showPrintMargin={false}
        showGutter={false}
        highlightActiveLine={false}
        wrapEnabled={true}
        readOnly={isDisabled}
        width="100%"
        height="auto"
        style={{
          textIndent: 'none',
          minHeight: '1rem',
          boxSizing: 'border-box',
        }}
        setOptions={{
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
