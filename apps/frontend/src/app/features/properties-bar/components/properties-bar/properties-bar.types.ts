import { SingleSelectedElement } from '@/features/properties-bar/use-single-selected-element';

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

export type PropertiesBarProps = PropertiesBarBaseProps & {
  headerLabel: string;
  deleteNodeLabel: string;
  deleteEdgeLabel: string;
  tabs?: PropertiesBarTab[];
  onTabChange: (tab: string) => void;
  onMenuHeaderClick?: () => void;
  onDeleteClick: () => void;
};
