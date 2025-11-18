import { registerComponentDecorator } from '@/features/plugins-core/adapters/adapter-components';
import { DiagramContainer } from '../diagram/diagram';
import { ModalProvider } from './providers/modal-provider';

type DiagramContainerProps = React.ComponentProps<typeof DiagramContainer>;

registerComponentDecorator<DiagramContainerProps>('DiagramContainer', {
  content: ModalProvider,
  place: 'after',
});
