import styles from './app-bar.module.css';
import './variables.css';

import { Controls } from './components/controls/controls';
import { ProjectSelection } from './components/project-selection/project-selection';
import { Toolbar } from './components/toolbar/toolbar';

/**
 * Editor header with the toolbar, the workflow name and the editor controls. Mount
 * via `<WorkflowBuilder.EditorHeader />` (or the named `<WorkflowBuilderEditorHeader />`
 * export) inside a custom layout; the default layout already includes it.
 *
 * @category Components
 */
export function AppBarContainer() {
  return (
    <div className={styles['app-bar']}>
      <div className={styles['container']}>
        <Toolbar />
        <ProjectSelection />
        <Controls />
      </div>
    </div>
  );
}
