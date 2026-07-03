import { registerComponentDecorator, registerFunctionDecorator, registerPluginTranslation } from '@workflowbuilder/sdk';

import { ButtonsUndoRedo } from './components/buttons-undo-redo/buttons-undo-redo';
import { trackFutureChangeDecorator } from './functions/decorators';
import * as translationEN from './locales/en/translation.json';
import * as translationPL from './locales/pl/translation.json';
import { UndoRedoProvider } from './providers/undo-redo-provider';

export function plugin(): void {
  registerComponentDecorator('OptionalHooks', {
    content: UndoRedoProvider,
  });

  registerComponentDecorator('OptionalAppBarTools', {
    content: ButtonsUndoRedo,
    place: 'after',
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
