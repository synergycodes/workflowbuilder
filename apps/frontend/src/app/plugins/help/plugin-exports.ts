import {
  hasRegisteredComponentDecorator,
  registerComponentDecorator,
} from '@/features/plugins-core/adapters/adapter-components';
import { registerFunctionDecorator } from '@/features/plugins-core/adapters/adapter-functions';
import { registerPluginTranslation } from '@/features/plugins-core/adapters/adapter-i18n';

import { ProjectSelection } from '@/features/app-bar/components/project-selection/project-selection';
import { DiagramContainer } from '@/features/diagram/diagram';
import { PropertiesBar } from '@/features/properties-bar/components/properties-bar/properties-bar';

import { getAppBarButton } from './components/app-bar/get-app-bar-button';
import { FooterSupportButton } from './components/footer-support-button';
import { Watermark } from './components/watermark/watermark';
import { addItemsToDots } from './functions/add-items-to-dots';
import { openNoAccessModal } from './functions/open-no-access-modal';
import * as translationEN from './locales/en/translation.json';
import * as translationPL from './locales/pl/translation.json';

registerComponentDecorator('OptionalFooterContent', {
  content: FooterSupportButton,
  place: 'after',
});

type DiagramContainerProps = React.ComponentProps<typeof DiagramContainer>;

registerComponentDecorator<DiagramContainerProps>('DiagramContainer', {
  content: Watermark,
});

registerFunctionDecorator('getControlsDotsItems', {
  callback: addItemsToDots,
  place: 'after',
  priority: 10,
});

type ProjectSelectionProps = React.ComponentProps<typeof ProjectSelection>;

registerComponentDecorator<ProjectSelectionProps>('ProjectSelection', {
  modifyProps: (props) => ({
    ...props,
    onDuplicateClick: openNoAccessModal,
  }),
});

type PropertiesBarProps = React.ComponentProps<typeof PropertiesBar>;

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
  });

  registerComponentDecorator('OptionalAppBarTools', {
    content: getAppBarButton('ArrowUUpRight', 'plugins.help.tooltipRedo'),
    place: 'after',
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
