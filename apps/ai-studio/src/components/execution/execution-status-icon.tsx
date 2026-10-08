import {
  ArrowsMerge,
  ArrowsSplit,
  Check,
  Clock,
  ExclamationMark,
  LinkBreak,
  SkipForward,
  Spinner,
} from '@phosphor-icons/react';
import clsx from 'clsx';

import styles from './execution-status-icon.module.css';

export type ExecutionStatusTone =
  | 'running'
  | 'completed'
  | 'waiting'
  | 'failed'
  | 'warning'
  | 'skipped'
  | 'incomplete'
  | 'branch'
  | 'join'
  | 'info'
  | 'neutral';

type Props = {
  tone: ExecutionStatusTone;
  /**
   * `s` is the execution log row (15 px), `m` the node header (20 px).
   * @default 's'
   */
  size?: 's' | 'm';
  className?: string;
};

// A bare "i" in Phosphor's 256 grid and bold stroke; a text glyph sits on the font's baseline, off centre.
function InfoGlyph() {
  return (
    <svg viewBox="0 0 256 256" fill="currentColor">
      <circle cx="128" cy="68" r="18" />
      <rect x="116" y="108" width="24" height="104" rx="12" />
    </svg>
  );
}

// Phosphor, not the SDK `Icon`: that one sets its size inline, so the glyphs would not follow the badge.
function Glyph({ tone }: { tone: ExecutionStatusTone }) {
  switch (tone) {
    case 'running': {
      return <Spinner weight="bold" className={styles['spin']} />;
    }
    case 'completed': {
      return <Check weight="bold" />;
    }
    case 'waiting': {
      return <Clock weight="bold" />;
    }
    case 'failed':
    case 'warning': {
      return <ExclamationMark weight="bold" />;
    }
    case 'skipped': {
      return <SkipForward weight="bold" />;
    }
    case 'incomplete': {
      return <LinkBreak weight="bold" />;
    }
    case 'branch': {
      return <ArrowsSplit weight="bold" className={styles['rightward']} />;
    }
    case 'join': {
      return <ArrowsMerge weight="bold" className={styles['rightward']} />;
    }
    case 'info': {
      return <InfoGlyph />;
    }
    case 'neutral': {
      return <span className={styles['dot']} />;
    }
  }
}

// One status language for the node header and the execution log rows.
export function ExecutionStatusIcon({ tone, size = 's', className }: Props) {
  return (
    <span className={clsx(styles['icon'], styles[size], styles[tone], className)} aria-hidden="true">
      <Glyph tone={tone} />
    </span>
  );
}
