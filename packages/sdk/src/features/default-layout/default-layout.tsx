import clsx from 'clsx';

import styles from './default-layout.module.css';

import { AppBarContainerLazy } from '../app-bar/app-bar-container-lazy';
import { DiagramContainer } from '../diagram/diagram';
import { DiagramWrapper } from '../diagram/diagram-wrapper';
import { PaletteContainerLazy } from '../palette/palette-container-lazy';
import { PropertiesBarContainerLazy } from '../properties-bar/properties-bar-container-lazy';

/**
 * Default editor layout — floating overlay with top bar, left palette,
 * right properties panel, and a full-screen canvas underneath. Rendered
 * automatically by `<WorkflowBuilder.Root>` when no children are passed.
 *
 * Mount it explicitly when you need to mix it with custom overlays:
 *
 * ```tsx
 * <WorkflowBuilder.Root>
 *   <WorkflowBuilder.DefaultLayout />
 *   <MyToast />
 * </WorkflowBuilder.Root>
 * ```
 *
 * @category Components
 */
export function DefaultLayout() {
  return (
    <div className={clsx(styles['container'], 'workflow-builder-root')}>
      <div className={styles['header']}>
        <AppBarContainerLazy />
      </div>
      <div className={styles['content']}>
        <div className={styles['panel']}>
          <PaletteContainerLazy />
        </div>
        <div id="viewport-bounds" className={styles['viewport-bounds']} />
        <div className={styles['panel']}>
          <div className={styles['right-panel']}>
            <PropertiesBarContainerLazy />
          </div>
        </div>
      </div>
      <DiagramWrapper>
        <DiagramContainer />
      </DiagramWrapper>
    </div>
  );
}
