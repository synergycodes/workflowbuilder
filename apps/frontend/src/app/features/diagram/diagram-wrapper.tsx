import { PropsWithChildren } from 'react';
import styles from '../../app.module.css';
import { useCommandHandler } from '@/hooks/use-command-handler';
import { useCommandHandlerKeyboard } from '@/hooks/use-command-handler-keyboard';

export function DiagramWrapper({ children }: PropsWithChildren) {
  const commandHandler = useCommandHandler();
  useCommandHandlerKeyboard(commandHandler);

  return <div className={styles['diagram-container']}>{children}</div>;
}
