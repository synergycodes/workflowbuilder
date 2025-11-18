import styles from './properties-bar.module.css';

import { SegmentPicker, Button } from '@synergycodes/overflow-ui';
import { withOptionalComponentPlugins } from '@/features/plugins-core/adapters/adapter-components';
import { EdgeProperties } from '../edge-properties/edge-properties';
import { PropertiesBarHeader } from '../header/properties-bar-header';
import { NodeProperties } from '../node-properties/node-properties';
import { Sidebar } from '@/components/sidebar/sidebar';
import { renderComponent } from './render-component';
import { PropertiesBarItem, PropertiesBarProps } from './properties-bar.types';

/**
 * PropertiesBarComponent - A configurable sidebar component for displaying and editing
 * properties of selected workflow elements (nodes and edges).
 *
 * This component provides a flexible tab-based interface that can be extended with custom tabs.
 * By default, it shows a "Properties" tab for basic element properties. Additional tabs can be
 * added through the `tabs` prop to extend functionality.
 * When no custom tabs exist, the SegmentPicker is hidden for a cleaner UI
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
  const name = selection?.node?.data?.properties?.label ?? selection?.edge?.data?.label;
  const isExpanded = !!selection;
  const hasCustomItems = tabs.length > 0;

  const segmentPicker = {
    when: () => isExpanded && !!selection?.node && selection.node.type === 'node' && hasCustomItems,
    component: () => (
      <SegmentPicker size="xxx-small" value={selectedTab} onChange={(_, value) => onTabChange(value)}>
        {[
          <SegmentPicker.Item key="properties" value="properties">
            Properties
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

  return (
    <Sidebar
      isExpanded={isExpanded}
      contentClassName={styles['extend-bounds']}
      header={
        <>
          <PropertiesBarHeader
            isExpanded={isExpanded}
            header={headerLabel}
            name={name ?? ''}
            onDotsClick={onMenuHeaderClick}
          />
          {isExpanded && renderComponent([segmentPicker], selection, selectedTab)}
        </>
      }
      footer={
        isExpanded && (
          <Button onClick={onDeleteClick} variant="ghost-destructive">
            {selection?.node ? deleteNodeLabel : deleteEdgeLabel}
          </Button>
        )
      }
    >
      {isExpanded && renderComponent(contentComponents, selection, selectedTab)}
    </Sidebar>
  );
}

export const PropertiesBar = withOptionalComponentPlugins(PropertiesBarComponent, 'PropertiesBar');
