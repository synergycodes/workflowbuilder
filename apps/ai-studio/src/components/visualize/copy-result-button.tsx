import { Check, Copy } from '@phosphor-icons/react';
import { useEffect, useRef, useState } from 'react';

import { copyResult } from '../../utils/export-visualization';

type Props = {
  className: string;
  getTarget: () => HTMLElement | null;
  text: string;
  disabled?: boolean;
};

export function CopyResultButton({ className, getTarget, text, disabled }: Props) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => globalThis.clearTimeout(timerRef.current), []);

  async function handleClick() {
    const target = getTarget();
    if (!target) return;
    if (await copyResult(target, text)) {
      setCopied(true);
      globalThis.clearTimeout(timerRef.current);
      timerRef.current = globalThis.setTimeout(() => setCopied(false), 1500);
    }
  }

  return (
    <button
      type="button"
      className={className}
      title={copied ? 'Copied' : 'Copy result'}
      disabled={disabled}
      onClick={() => void handleClick()}
    >
      {copied ? <Check /> : <Copy />}
    </button>
  );
}
