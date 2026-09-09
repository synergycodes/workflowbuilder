import { useStore } from '../../../../../store/store';
import { VariablePreview, type VariablePreviewProps } from '../variable-preview';

type Props = Omit<VariablePreviewProps, 'variable'> & {
  id: string;
  onEdit?: () => void;
  onRemove?: () => void;
};

export function GlobalVariablePreview(props: Props) {
  const variable = useStore((store) => store.globalVariables[props.id]);

  if (!variable) {
    return null;
  }

  return <VariablePreview {...props} variable={variable} />;
}
