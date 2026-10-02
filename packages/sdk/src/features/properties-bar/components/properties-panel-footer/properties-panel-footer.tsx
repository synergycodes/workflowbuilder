import {
  type PropsWithChildren,
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
} from 'react';
import { createPortal } from 'react-dom';

type FooterTarget = {
  element: HTMLElement | null;
  /** Counts one piece of footer content in; the returned function counts it out. */
  register: () => () => void;
};

const FooterTargetContext = createContext<FooterTarget | null>(null);

/** The panel's side of {@link PropertiesPanelFooter}: whether any content waits for the footer, and where it goes. */
export function usePropertiesPanelFooterTarget() {
  const [element, setElement] = useState<HTMLElement | null>(null);
  const [contentCount, setContentCount] = useState(0);
  const register = useCallback(() => {
    setContentCount((count) => count + 1);
    return () => setContentCount((count) => count - 1);
  }, []);
  const target = useMemo(() => ({ element, register }), [element, register]);

  return { target, hasContent: contentCount > 0, setElement };
}

export const PropertiesPanelFooterTargetProvider = FooterTargetContext.Provider;

/**
 * Renders its children in the footer of the properties panel, below the scrolling content. Place it
 * anywhere inside the panel's content, for example in a JsonForms control: the children stay in that
 * component's tree, with its state and context, and only appear in the footer. Outside the panel it
 * renders nothing.
 *
 * @example
 * ```tsx
 * <PropertiesPanelFooter>
 *   <Button variant="primary" onClick={approve}>Approve</Button>
 * </PropertiesPanelFooter>
 * ```
 *
 * @category Components
 */
export function PropertiesPanelFooter({ children }: PropsWithChildren) {
  const target = useContext(FooterTargetContext);
  const register = target?.register;

  useLayoutEffect(() => register?.(), [register]);

  return target?.element ? createPortal(children, target.element) : null;
}
