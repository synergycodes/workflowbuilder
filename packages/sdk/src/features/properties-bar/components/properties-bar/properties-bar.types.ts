import type { SingleSelectedElement } from '../../use-single-selected-element';

type PropertiesBarSelection = Omit<PropertiesBarBaseProps, 'selection'> & {
  selection: SingleSelectedElement;
};

type PropertiesBarTab = {
  label: string;
  value: string;
  components: PropertiesBarItem[];
};

type PropertiesBarBaseProps = {
  selection: SingleSelectedElement | null;
  selectedTab: string;
};

export type PropertiesBarItem = {
  when: (props: PropertiesBarSelection) => boolean;
  component: (props: PropertiesBarSelection) => React.ReactNode;
};

/**
 * Props accepted by {@link PropertiesBar}.
 *
 * Provide localized labels (`headerLabel`, `deleteNodeLabel`,
 * `deleteEdgeLabel`), the active tab + change handler, the delete handler,
 * and an optional `tabs` array for extra tabs alongside the default
 * "Properties" tab.
 *
 * @category Components
 */
export type PropertiesBarProps = PropertiesBarBaseProps & {
  headerLabel: string;
  deleteNodeLabel: string;
  deleteEdgeLabel: string;
  tabs?: PropertiesBarTab[];
  onTabChange: (tab: string) => void;
  onMenuHeaderClick?: () => void;
  onDeleteClick: () => void;
};
