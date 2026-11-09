import { Transition, type TransitionProps } from 'notistack';
import { type CSSProperties, type RefObject, useRef } from 'react';

type TransitionStatus = 'entering' | 'entered' | 'exiting' | 'exited' | 'unmounted';

// A faded snackbar stays in place until notistack collapses it, so it must not take clicks meanwhile.
const HIDDEN: CSSProperties = { opacity: 0, transform: 'translateY(8px)', pointerEvents: 'none' };
const SHOWN: CSSProperties = { opacity: 1, transform: 'none' };

const STATUS_STYLE: Record<TransitionStatus, CSSProperties> = {
  unmounted: HIDDEN,
  exited: HIDDEN,
  entering: SHOWN,
  entered: SHOWN,
  exiting: { opacity: 0, transform: 'none', pointerEvents: 'none' },
};

// notistack's default Slide rises from the viewport bottom, so a raised stack would cross what lies below it.
export function SnackbarTransition({ children, timeout = 0, onEnter, ...other }: TransitionProps) {
  // notistack types the ref the React 18 way, without null.
  const nodeRef = useRef<HTMLDivElement>(null) as RefObject<HTMLDivElement>;
  const duration = typeof timeout === 'number' ? timeout : (timeout.enter ?? 0);

  return (
    <Transition
      {...other}
      appear
      timeout={timeout}
      nodeRef={nodeRef}
      onEnter={(node, isAppearing) => {
        // Reading layout commits the hidden style, so the browser has a start to transition from.
        void node.scrollTop;
        onEnter?.(node, isAppearing);
      }}
    >
      {(status) => (
        <div
          ref={nodeRef}
          style={{
            transition: `opacity ${duration}ms ease-out, transform ${duration}ms ease-out`,
            ...STATUS_STYLE[status],
          }}
        >
          {children}
        </div>
      )}
    </Transition>
  );
}
