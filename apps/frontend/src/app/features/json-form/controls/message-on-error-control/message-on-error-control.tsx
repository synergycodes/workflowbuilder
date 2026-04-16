import { Message } from '@/components/form/message/message';

import { useTranslateIfPossible } from '@/hooks/use-translate-if-possible';

import { MessageOnErrorProps } from '../../types/controls';
import { createControlRenderer } from '../../utils/rendering';
import { ControlWrapper } from '../control-wrapper';

function MessageOnErrorControl(props: MessageOnErrorProps) {
  const translateIfPossible = useTranslateIfPossible();
  const { errors, uischema } = props;
  const { text } = uischema;

  const hasErrors = errors.length > 0;

  if (hasErrors === false) {
    return null;
  }

  const message = translateIfPossible(text) || errors || text;

  if (!message) {
    return null;
  }

  return (
    <ControlWrapper {...props}>
      <Message variant="error">{message}</Message>
    </ControlWrapper>
  );
}

export const messageOnErrorControlRenderer = createControlRenderer('MessageOnError', MessageOnErrorControl);
