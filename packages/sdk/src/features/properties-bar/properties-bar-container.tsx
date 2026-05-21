import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useRemoveElements } from '../../hooks/use-remove-elements';
import { PropertiesBar } from './components/properties-bar/properties-bar';
import { useSingleSelectedElement } from './use-single-selected-element';

/**
 * Right-side properties panel — renders the form for the currently selected
 * node or edge, plus its tabs (properties, variables). Mount via
 * `<WorkflowBuilder.PropertiesPanel />` (or the named
 * `<WorkflowBuilderPropertiesPanel />` export) inside a custom layout; the
 * default layout already includes it.
 *
 * @category Components
 */
export function PropertiesBarContainer() {
  const { removeElements } = useRemoveElements();
  const { t } = useTranslation();

  const [selectedTab, setSelectedTab] = useState('properties');

  const selection = useSingleSelectedElement();
  const selectionId = useMemo(() => selection?.node?.id, [selection]);

  useEffect(() => {
    setSelectedTab('properties');
  }, [selectionId]);

  function handleDeleteClick() {
    if (selection) {
      removeElements(selection);
    }
  }

  return (
    <PropertiesBar
      selection={selection}
      onDeleteClick={handleDeleteClick}
      headerLabel={t('propertiesBar.label')}
      deleteNodeLabel={t('propertiesBar.deleteNode')}
      deleteEdgeLabel={t('propertiesBar.deleteEdge')}
      selectedTab={selectedTab}
      onTabChange={setSelectedTab}
    />
  );
}
