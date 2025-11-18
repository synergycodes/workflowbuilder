import styles from './app-bar.module.css';
import './variables.css';

import { noop } from '@/utils/noop';

import { Toolbar } from './components/toolbar/toolbar';
import { ProjectSelection } from './components/project-selection/project-selection';
import { Controls } from './components/controls/controls';

export function AppBarContainer() {
  return (
    <div className={styles['container']}>
      <Toolbar />
      <ProjectSelection onDuplicateClick={noop} />
      <Controls />
    </div>
  );
}
