import { IndicatorDot } from '../components/indicator-dot/indicator-dot';
import { BaseLayoutElement, LayoutProps } from '../types/layouts';

type Props = LayoutProps<BaseLayoutElement> & {
  children: React.ReactNode;
  hasErrors?: boolean;
};

export function LayoutWrapper({ children, visible, hasErrors = false }: Props) {
  if (!visible) {
    return;
  }

  return (
    <>
      {hasErrors && <IndicatorDot>{children}</IndicatorDot>}
      {!hasErrors && children}
    </>
  );
}
