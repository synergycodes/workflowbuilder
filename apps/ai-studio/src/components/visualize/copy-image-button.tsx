import { Check, Copy } from '@phosphor-icons/react';
import { useEffect, useRef, useState } from 'react';

import { copyImage } from '../../utils/export-visualization';

type Props = {
  className: string;
  getTarget: () => HTMLElement | null;
  disabled?: boolean;
};

export function CopyImageButton({ className, getTarget, disabled }: Props) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => globalThis.clearTimeout(timerRef.current), []);

  async function handleClick() {
    const target = getTarget();
    if (!target) return;
    if (await copyImage(target)) {
      setCopied(true);
      globalThis.clearTimeout(timerRef.current);
      timerRef.current = globalThis.setTimeout(() => setCopied(false), 1500);
    }
  }

  return (
    <button
      type="button"
      className={className}
      title={copied ? 'Copied' : 'Copy image'}
      disabled={disabled}
      onClick={() => void handleClick()}
    >
      {copied ? <Check /> : <Copy />}
    </button>
  );
}
