import type { PropsWithChildren } from 'react';

import styles from '../default-layout/default-layout.module.css';

import { useCommandHandler } from '../../hooks/use-command-handler';
import { useCommandHandlerKeyboard } from '../../hooks/use-command-handler-keyboard';

export function DiagramWrapper({ children }: PropsWithChildren) {
  const commandHandler = useCommandHandler();
  useCommandHandlerKeyboard(commandHandler);

  return <div className={styles['diagram-container']}>{children}</div>;
}
