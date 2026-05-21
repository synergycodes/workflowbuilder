import type { DiagramContainer } from '../diagram/diagram';
import { registerComponentDecorator } from '../plugins-core/adapters/adapter-components';
import { ModalProvider } from './providers/modal-provider';

type DiagramContainerProps = React.ComponentProps<typeof DiagramContainer>;

// See `features/i18n/plugin-exports.ts` for why this is a function rather
// than a side-effect import.
export const plugin = () => {
  registerComponentDecorator<DiagramContainerProps>('DiagramContainer', {
    content: ModalProvider,
    place: 'after',
  });
};
