import { type Icon, Plus } from '@phosphor-icons/react';
import clsx from 'clsx';
import { useId } from 'react';

import styles from './template-tile.module.css';

import type { TemplateCategory } from './welcome-templates';

type Props = {
  title: string;
  description: string;
  onClick: () => void;
} & (
  | { kind: 'template'; icon: Icon; category: TemplateCategory; recommended?: boolean }
  | { kind: 'empty'; recommended?: never }
);

// A click acts at once, so there is no selected state. Screen readers hear the title (and Recommended) as the
// name and the description after it, instead of the whole tile as one string.
export function TemplateTile(props: Props) {
  const { title, description, onClick, recommended = false } = props;
  const titleId = useId();
  const badgeId = useId();
  const descriptionId = useId();
  const Glyph = props.kind === 'template' ? props.icon : Plus;

  return (
    <button
      type="button"
      className={clsx(styles['tile'], props.kind === 'empty' && styles['empty'], recommended && styles['recommended'])}
      aria-labelledby={recommended ? `${titleId} ${badgeId}` : titleId}
      aria-describedby={descriptionId}
      onClick={onClick}
    >
      <span className={styles['top']}>
        <span
          className={clsx(
            styles['icon-tile'],
            props.kind === 'template' ? styles[props.category] : styles['empty-icon'],
          )}
        >
          <Glyph aria-hidden="true" />
        </span>
        {recommended && (
          <span id={badgeId} className={clsx('wb-text-label-s-emphasized', styles['badge'])}>
            Recommended
          </span>
        )}
      </span>
      <span className={styles['text']}>
        <span id={titleId} className={clsx('wb-text-title-s-emphasized', styles['title'])}>
          {title}
        </span>
        <span id={descriptionId} className={clsx('wb-text-body-s', styles['description'])}>
          {description}
        </span>
      </span>
    </button>
  );
}
