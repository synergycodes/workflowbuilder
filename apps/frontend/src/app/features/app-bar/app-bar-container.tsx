import styles from './app-bar.module.css';
import './variables.css';

import { noop } from '@/utils/noop';

import { Controls } from './components/controls/controls';
import { ProjectSelection } from './components/project-selection/project-selection';
import { Toolbar } from './components/toolbar/toolbar';

export function AppBarContainer() {
  return (
    <div className={styles['container']}>
      <Toolbar />
      <ProjectSelection onDuplicateClick={noop} />
      <Controls />
    </div>
  );
}
