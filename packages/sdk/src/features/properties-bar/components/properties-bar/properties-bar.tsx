import { Button, SegmentPicker } from '@workflowbuilder/ui';
import { useTranslation } from 'react-i18next';

import styles from './properties-bar.module.css';

import { Sidebar } from '../../../../components/sidebar/sidebar';
import { useStore } from '../../../../store/store';
import { withOptionalComponentPlugins } from '../../../plugins-core/adapters/adapter-components';
import { removedPropertyWarning } from '../../../plugins-core/adapters/removed-api';
import { AreaTarget } from '../../../ui-extensions/area-target';
import { useIsBuiltInControlVisible } from '../../../ui-extensions/built-in-controls-context';
import { useWarnOnce } from '../../../ui-extensions/use-warn-once';
import { EdgeProperties } from '../edge-properties/edge-properties';
import { PropertiesBarHeader } from '../header/properties-bar-header';
import { NodeProperties } from '../node-properties/node-properties';
import type { PropertiesBarItem, WorkflowBuilderPropertiesPanelProps } from './properties-bar.types';
import { renderComponent } from './render-component';

/**
 * Right-hand sidebar that displays and edits properties of the currently
 * selected node or edge. Mounted automatically by the editor's app shell.
 *
 * @internal — not part of the public API; use {@link WorkflowBuilderPropertiesPanelProps}
 * to type a decorator on the `'PropertiesPanel'` slot instead.
 */
function PropertiesBarComponent(props: WorkflowBuilderPropertiesPanelProps) {
  const {
    selection,
    onDeleteClick,
    headerLabel,
    deleteNodeLabel,
    deleteEdgeLabel,
    selectedTab,
    onTabChange,
    tabs = [],
  } = props;
  // A `modifyProps` decorator can still inject the prop 4.0 removed.
  useWarnOnce(
    'onMenuHeaderClick' in props,
    removedPropertyWarning('onMenuHeaderClick', 'PropertiesPanel', 'PropertiesPanelMenuItem'),
  );
  const { t } = useTranslation();
  const isPropertiesBarOpen = useStore((state) => state.isPropertiesPanelOpen);
  const setIsPropertiesBarOpen = useStore((state) => state.setPropertiesPanelOpen);
  const isDeleteVisible = useIsBuiltInControlVisible('delete');

  const isExpanded = !!selection && isPropertiesBarOpen;
  const hasCustomItems = tabs.length > 0;

  const segmentPicker = {
    when: () => isExpanded && !!selection?.node && selection.node.type === 'node' && hasCustomItems,
    component: () => (
      <SegmentPicker size="xxx-small" value={selectedTab} onChange={(_, value) => onTabChange(value)}>
        {[
          <SegmentPicker.Item key="properties" value="properties">
            {t('propertiesBar.label')}
          </SegmentPicker.Item>,
          ...tabs.map(({ label, value }) => (
            <SegmentPicker.Item key={value} value={value}>
              {label}
            </SegmentPicker.Item>
          )),
        ]}
      </SegmentPicker>
    ),
  };

  const contentComponents: PropertiesBarItem[] = [
    {
      when: ({ selection, selectedTab }) => !!selection.node && selectedTab === 'properties',
      component: ({ selection }) => <NodeProperties node={selection.node!} />,
    },
    {
      when: ({ selection }) => !!selection.edge,
      component: ({ selection }) => <EdgeProperties edge={selection.edge!} />,
    },
    ...tabs.flatMap((tab) => tab.components),
  ];

  function onToggleExpand() {
    setIsPropertiesBarOpen(!isPropertiesBarOpen);
  }

  return (
    <Sidebar
      role="region"
      aria-label={headerLabel}
      isExpanded={isExpanded}
      contentClassName={styles['extend-bounds']}
      header={
        <>
          <PropertiesBarHeader
            selection={selection}
            headerLabel={headerLabel}
            isOpen={isExpanded}
            onTogglePropertiesBar={onToggleExpand}
          />
          {isExpanded && <AreaTarget area="propertiesPanelHeader" />}
          {isExpanded && renderComponent([segmentPicker], selection, selectedTab)}
          {isExpanded && <AreaTarget area="propertiesPanelHeader" place="after" />}
        </>
      }
      footer={
        <>
          <AreaTarget area="propertiesPanelFooter" />
          {isDeleteVisible && onDeleteClick && (
            <Button onClick={onDeleteClick} variant="ghost-critical">
              {selection?.node ? deleteNodeLabel : deleteEdgeLabel}
            </Button>
          )}
          <AreaTarget area="propertiesPanelFooter" place="after" />
        </>
      }
    >
      {isExpanded && renderComponent(contentComponents, selection, selectedTab)}
    </Sidebar>
  );
}

/**
 * @internal Decorate via {@link registerComponentDecorator}`<WorkflowBuilderPropertiesPanelProps>('PropertiesPanel', …)`
 * — direct mounts aren't supported and aren't part of the public API.
 */
export const PropertiesBar = withOptionalComponentPlugins(PropertiesBarComponent, 'PropertiesPanel');
