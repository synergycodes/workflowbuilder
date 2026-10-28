import { registerComponentDecorator, registerFunctionDecorator, registerPluginTranslation } from '@workflowbuilder/sdk';

import { AppBarUndoRedo } from './components/app-bar-undo-redo/app-bar-undo-redo';
import { trackFutureChangeDecorator } from './functions/decorators';
import * as translationEN from './locales/en/translation.json';
import * as translationPL from './locales/pl/translation.json';
import { UndoRedoProvider } from './providers/undo-redo-provider';

export function plugin(): void {
  registerComponentDecorator('OptionalHooks', {
    content: UndoRedoProvider,
  });

  registerComponentDecorator('OptionalAppChildren', {
    content: AppBarUndoRedo,
    name: 'UndoRedo',
  });

  registerFunctionDecorator('trackFutureChange', {
    callback: trackFutureChangeDecorator,
  });

  registerPluginTranslation({
    en: {
      translation: translationEN,
    },
    pl: {
      translation: translationPL,
    },
  });
}
