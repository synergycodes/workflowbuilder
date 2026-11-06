import { Input } from '@workflowbuilder/ui';
import { useEffect, useState } from 'react';

import { type TimeHHmm, getTimeHHmm } from '../../../../../utils/time-iso';

type TimeInputProps = {
  className?: string;
  value?: TimeHHmm;
  /** Committed when the field is left without a valid `HH:mm`; omitted, leaving it commits `undefined`. */
  fallback?: TimeHHmm;
  onCommit: (time: TimeHHmm | undefined) => void;
  placeholder?: string;
  suffixIcon?: React.ReactNode;
  disabled?: boolean;
  isError?: boolean;
};

const TIME_LENGTH = 'HH:mm'.length;

/** Commits a valid `HH:mm` as soon as it is typed; a changed `value` replaces whatever is typed. */
export function TimeInput({
  className,
  value,
  fallback,
  onCommit,
  placeholder,
  suffixIcon,
  disabled = false,
  isError = false,
}: TimeInputProps) {
  const [draft, setDraft] = useState<string>(value ?? '');

  useEffect(() => {
    setDraft(value ?? '');
  }, [value]);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const text = event.target.value;
    const time = getTimeHHmm(text);

    setDraft(text);

    if (time && time !== value) {
      onCommit(time);
    }
  };

  const handleBlur = () => {
    if (getTimeHHmm(draft)) {
      return;
    }

    setDraft(fallback ?? '');

    if (fallback !== value) {
      onCommit(fallback);
    }
  };

  return (
    <Input
      className={className}
      value={draft}
      maxLength={TIME_LENGTH}
      placeholder={placeholder}
      suffixIcon={suffixIcon}
      onChange={handleChange}
      onBlur={handleBlur}
      disabled={disabled}
      state={isError ? 'critical' : 'default'}
    />
  );
}
