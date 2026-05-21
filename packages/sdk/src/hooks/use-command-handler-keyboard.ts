/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect } from 'react';

import type { CommandHandler } from './use-command-handler';
import { useKeyPress } from './use-key-press';

export function useCommandHandlerKeyboard(commandHandler: CommandHandler) {
  const a = useKeyPress('a', { withControlOrMeta: true });

  useEffect(() => {
    if (a) {
      commandHandler.selectAll();
    }
  }, [a]);
}
