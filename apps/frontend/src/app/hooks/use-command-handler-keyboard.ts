/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect } from 'react';

import { CommandHandler } from './use-command-handler';
import { useKeyPress } from './use-key-press';

export function useCommandHandlerKeyboard(commandHandler: CommandHandler) {
  const x = useKeyPress('x', { withControlOrMeta: true });
  const c = useKeyPress('c', { withControlOrMeta: true });
  const v = useKeyPress('v', { withControlOrMeta: true });
  const a = useKeyPress('a', { withControlOrMeta: true });
  const z = useKeyPress('z', { withControlOrMeta: true, skipTarget: true });
  const y = useKeyPress('y', { withControlOrMeta: true, skipTarget: true });

  useEffect(() => {
    if (x) {
      commandHandler.cut();
    }
  }, [x]);

  useEffect(() => {
    if (c) {
      commandHandler.copy();
    }
  }, [c]);

  useEffect(() => {
    if (v) {
      commandHandler.paste();
    }
  }, [v]);

  useEffect(() => {
    if (a) {
      commandHandler.selectAll();
    }
  }, [a]);

  useEffect(() => {
    if (z) {
      commandHandler.undo();
    }
  }, [z]);

  useEffect(() => {
    if (y) {
      commandHandler.redo();
    }
  }, [y]);
}
