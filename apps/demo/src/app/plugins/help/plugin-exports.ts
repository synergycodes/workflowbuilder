import {
  hasRegisteredComponentDecorator,
  registerComponentDecorator,
  registerFunctionDecorator,
  registerPluginTranslation,
} from '@workflowbuilder/sdk';
import type { DiagramContainerProps, ProjectSelectionProps, PropertiesBarProps } from '@workflowbuilder/sdk';

import { getAppBarButton } from './components/app-bar/get-app-bar-button';
import { FooterSupportButton } from './components/footer-support-button';
import { Watermark } from './components/watermark/watermark';
import { addItemsToDots } from './functions/add-items-to-dots';
import { openNoAccessModal } from './functions/open-no-access-modal';
import * as translationEN from './locales/en/translation.json';
import * as translationPL from './locales/pl/translation.json';

export function plugin(): void {
  registerComponentDecorator('OptionalFooterContent', {
    content: FooterSupportButton,
    place: 'after',
  });

  registerComponentDecorator<DiagramContainerProps>('DiagramContainer', {
    content: Watermark,
  });

  registerFunctionDecorator('getControlsDotsItems', {
    callback: addItemsToDots,
    place: 'after',
    priority: 10,
  });

  registerComponentDecorator<ProjectSelectionProps>('ProjectSelection', {
    modifyProps: (props) => ({
      ...props,
      onDuplicateClick: openNoAccessModal,
    }),
  });

  registerComponentDecorator<PropertiesBarProps>('PropertiesBar', {
    modifyProps: (props) => ({
      ...props,
      onMenuHeaderClick: openNoAccessModal,
    }),
  });

  registerComponentDecorator('OptionalAppBarTools', {
    content: getAppBarButton('FolderOpen', 'plugins.help.tooltipOpen'),
    place: 'after',
    priority: 10,
  });

  /*
    This plugin checks whether those buttons are already registered
    to avoid rendering hints about features that have been added to the project.
  */
  if (hasRegisteredComponentDecorator('OptionalAppBarTools', 'UndoRedo') === false) {
    registerComponentDecorator('OptionalAppBarTools', {
      content: getAppBarButton('ArrowUUpLeft', 'plugins.help.tooltipUndo'),
      place: 'after',
      name: 'OptionalAppBarToolsArrowUUpLeft',
    });

    registerComponentDecorator('OptionalAppBarTools', {
      content: getAppBarButton('ArrowUUpRight', 'plugins.help.tooltipRedo'),
      place: 'after',
      name: 'OptionalAppBarToolsArrowUUpRight',
    });
  }

  if (hasRegisteredComponentDecorator('OptionalAppBarControls', 'ElkLayout') === false) {
    registerComponentDecorator('OptionalAppBarControls', {
      content: getAppBarButton('TreeStructureDown', 'plugins.help.tooltipElk'),
      place: 'before',
    });
  }

  registerPluginTranslation({
    en: {
      translation: translationEN,
    },
    pl: {
      translation: translationPL,
    },
  });
}
