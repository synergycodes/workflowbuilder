import { SingleSelectedElement } from '../../use-single-selected-element';
import { PropertiesBarItem } from './properties-bar.types';

export function renderComponent(
  componentMap: PropertiesBarItem[],
  selection: SingleSelectedElement,
  selectedTab: string,
) {
  return componentMap.find(({ when }) => when({ selection, selectedTab }))?.component({ selection, selectedTab });
}
