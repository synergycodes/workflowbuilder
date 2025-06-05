import { FormControlWithLabel } from '@/components/form/form-control-with-label/form-control-with-label';
import { BaseControlProps } from '../types/controls';
import { IndicatorDot } from '../components/indicator-dot/indicator-dot';

type Props = BaseControlProps & {
  children: React.ReactNode;
};

export function ControlWrapper({ children, uischema, errors, ...props }: Props) {
  const { required, visible } = props;
  const { label, errorIndicatorEnabled = true } = uischema;

  if (!visible) {
    return;
  }

  const hasLabel = typeof label === 'string';
  const showIndicatorDot = errors.length > 0 && errorIndicatorEnabled;
  const childrenControl = showIndicatorDot ? <IndicatorDot>{children}</IndicatorDot> : children;

  return (
    <>
      {hasLabel ? (
        <FormControlWithLabel label={label} required={required}>
          {childrenControl}
        </FormControlWithLabel>
      ) : (
        <>{childrenControl}</>
      )}
    </>
  );
}
