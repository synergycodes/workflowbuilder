import styles from './properties-bar-header.module.css';

import { NavButton } from '@synergycodes/axiom';
import { Icon } from '@workflow-builder/icons';

type Props = {
  header: string;
  name: string;
  isExpanded: boolean;
  onDotsClick: () => void;
};

export function PropertiesBarHeader({ isExpanded, header, name, onDotsClick }: Props) {
  return (
    <div className={styles['header']}>
      <div className={styles['text-container']}>
        <span className={name ? 'ax-public-h9' : 'ax-public-h7'}>{header}</span>
        {isExpanded && <p className="ax-public-p11">{name}</p>}
      </div>
      <NavButton size="small" onClick={onDotsClick}>
        <Icon name="DotsThreeVertical" />
      </NavButton>
    </div>
  );
}
