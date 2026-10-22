import { Button, SegmentPicker } from '@workflowbuilder/ui';
import { useTranslation } from 'react-i18next';

import styles from './properties-bar.module.css';

import { Sidebar } from '../../../../components/sidebar/sidebar';
import { useStore } from '../../../../store/store';
import { withOptionalComponentPlugins } from '../../../plugins-core/adapters/adapter-components';
import { AreaTarget } from '../../../ui-extensions/area-target';
import { useIsBuiltInControlVisible } from '../../../ui-extensions/built-in-controls-context';
import { EdgeProperties } from '../edge-properties/edge-properties';
import { PropertiesBarHeader } from '../header/properties-bar-header';
import { NodeProperties } from '../node-properties/node-properties';
import type { PropertiesBarItem, PropertiesBarProps } from './properties-bar.types';
import { renderComponent } from './render-component';

/**
 * Right-hand sidebar that displays and edits properties of the currently
 * selected node or edge. Mounted automatically by the editor's app shell.
 *
 * @internal — not part of the public API; use {@link PropertiesBarProps}
 * to type a decorator on the `'PropertiesBar'` slot instead.
 */
function PropertiesBarComponent({
  selection,
  onMenuHeaderClick,
  onDeleteClick,
  headerLabel,
  deleteNodeLabel,
  deleteEdgeLabel,
  selectedTab,
  onTabChange,
  tabs = [],
}: PropertiesBarProps) {
  const { t } = useTranslation();
  const isPropertiesBarOpen = useStore((state) => state.isPropertiesPanelOpen);
  const setIsPropertiesBarOpen = useStore((state) => state.setIsPropertiesPanelOpen);
  const isDeleteVisible = useIsBuiltInControlVisible('delete');

  const name = selection?.node?.data?.properties?.label ?? selection?.edge?.data?.label;
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
      isExpanded={isExpanded}
      contentClassName={styles['extend-bounds']}
      header={
        <>
          <PropertiesBarHeader
            hasSelection={!!selection}
            isExpendable={isPropertiesBarOpen}
            isExpanded={isExpanded}
            onTogglePropertiesBar={onToggleExpand}
            header={headerLabel}
            name={name ?? ''}
            onDotsClick={onMenuHeaderClick}
          />
          {isExpanded && <AreaTarget area="propertiesPanelHeader" />}
          {isExpanded && renderComponent([segmentPicker], selection, selectedTab)}
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
        </>
      }
    >
      {isExpanded && renderComponent(contentComponents, selection, selectedTab)}
    </Sidebar>
  );
}

/**
 * @internal Decorate via {@link registerComponentDecorator}`<PropertiesBarProps>('PropertiesBar', …)`
 * — direct mounts aren't supported and aren't part of the public API.
 */
export const PropertiesBar = withOptionalComponentPlugins(PropertiesBarComponent, 'PropertiesBar');
