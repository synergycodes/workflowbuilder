// sort-imports-ignore
import clsx from 'clsx';
// https://securingsincity.github.io/react-ace/
import AceEditor from 'react-ace';
import 'ace-builds/src-noconflict/ext-language_tools';
import 'ace-builds/src-noconflict/mode-json';
import 'ace-builds/src-noconflict/mode-javascript';
import 'ace-builds/src-noconflict/theme-github_light_default';

import styles from './syntax-highlighter.module.css';

export type SyntaxHighlighterProps = {
  value: string;
  onChange?: (value?: string) => void;
  isDisabled?: boolean;
  mode?: string;
};

export function SyntaxHighlighter(props: SyntaxHighlighterProps) {
  const { value, onChange, mode = 'json', isDisabled } = props;

  return (
    <div className={clsx(styles['container'])}>
      <AceEditor
        name="field"
        value={value}
        mode={mode}
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
