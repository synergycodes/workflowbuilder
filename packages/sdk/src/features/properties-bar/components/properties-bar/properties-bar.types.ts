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
 * @category Components
 */
export type PropertiesBarProps = PropertiesBarBaseProps & {
  headerLabel: string;
  deleteNodeLabel: string;
  deleteEdgeLabel: string;
  tabs?: PropertiesBarTab[];
  onTabChange: (tab: string) => void;
  /**
   * Fallback for the header's menu button, shown only while the panel is expanded and no
   * `PropertiesPanelMenuItem` is registered. Once any are registered, the header shows a menu
   * of those items instead and this handler is ignored.
   *
   * @deprecated Use {@link PropertiesPanelMenuItem} instead.
   */
  onMenuHeaderClick?: () => void;
  onDeleteClick?: () => void;
};
