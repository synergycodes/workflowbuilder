import styles from './app-bar.module.css';
import './variables.css';

import { Controls } from './components/controls/controls';
import { ProjectSelection } from './components/project-selection/project-selection';
import { Toolbar } from './components/toolbar/toolbar';

/**
 * Top bar with toolbar, project selector, and integration controls. Mount
 * via `<WorkflowBuilder.TopBar />` (or the named `<WorkflowBuilderTopBar />`
 * export) inside a custom layout; the default layout already includes it.
 *
 * @category Components
 */
export function AppBarContainer() {
  return (
    <div className={styles['container']}>
      <Toolbar />
      <ProjectSelection />
      <Controls />
    </div>
  );
}
