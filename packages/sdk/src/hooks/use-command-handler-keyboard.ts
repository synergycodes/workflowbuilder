/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect } from 'react';

import type { CommandHandler } from './use-command-handler';
import { useKeyPress } from './use-key-press';

export function useCommandHandlerKeyboard(commandHandler: CommandHandler) {
  const a = useKeyPress('a', { withControlOrMeta: true });
  const plus = useKeyPress('+', { withControlOrMeta: true });
  const equal = useKeyPress('=', { withControlOrMeta: true });
  const minus = useKeyPress('-', { withControlOrMeta: true });

  useEffect(() => {
    if (a) {
      commandHandler.selectAll();
    }
  }, [a]);

  useEffect(() => {
    if (plus || equal) {
      commandHandler.zoomIn();
    }
  }, [plus, equal]);

  useEffect(() => {
    if (minus) {
      commandHandler.zoomOut();
    }
  }, [minus]);
}
