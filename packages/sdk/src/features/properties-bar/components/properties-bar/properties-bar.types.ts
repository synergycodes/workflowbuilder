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
 * `deleteEdgeLabel`), the active tab + change handler, and an optional
 * `tabs` array for extra tabs alongside the default "Properties" tab.
 * The Delete button shows only with `onDeleteClick`; a decorator on the
 * `'PropertiesBar'` slot that sets it to `undefined` removes the button.
 *
 * The header shows the selected node's icon, label and type label, or the
 * selected edge's icon, label and "Link". `onMenuHeaderClick` adds a menu button to it.
 *
 * @category Components
 */
export type PropertiesBarProps = PropertiesBarBaseProps & {
  /** Header text while nothing is selected; a selected node or edge shows its own heading instead. */
  headerLabel: string;
  deleteNodeLabel: string;
  deleteEdgeLabel: string;
  tabs?: PropertiesBarTab[];
  onTabChange: (tab: string) => void;
  onMenuHeaderClick?: () => void;
  onDeleteClick?: () => void;
};
