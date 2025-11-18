import { FORM_TOOLS_NAME } from '../add-ai-tool-form-content/add-ai-tool-form-content';
import styles from './add-ai-tool-footer.module.css';
import { Button } from '@synergycodes/overflow-ui';

type Props = {
  onCancelClick: () => void;
};

export function AddAiToolFooter({ onCancelClick }: Props) {
  return (
    <div className={styles['footer']}>
      <Button variant="secondary" onClick={onCancelClick}>
        Cancel
      </Button>
      <Button variant="primary" type="submit" form={FORM_TOOLS_NAME}>
        Confirm
      </Button>
    </div>
  );
}
