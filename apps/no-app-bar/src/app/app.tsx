import { WorkflowBuilder } from '@workflowbuilder/sdk';

import styles from './layout.module.css';
import '@workflowbuilder/sdk/style.css';

import { step } from './nodes/step/step';
import { Toolbar } from './toolbar';

const nodeTypes = [step];

export function App() {
  return (
    <WorkflowBuilder.Root name="no-app-bar" nodeTypes={nodeTypes}>
      <div className={styles['shell']}>
        <Toolbar />
        <div className={styles['body']}>
          <div className={styles['palette']}>
            <WorkflowBuilder.Palette />
          </div>
          <div className={styles['canvas']}>
            <WorkflowBuilder.Canvas />
          </div>
          <div className={styles['properties']}>
            <WorkflowBuilder.PropertiesPanel />
          </div>
        </div>
      </div>
    </WorkflowBuilder.Root>
  );
}
