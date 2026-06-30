import { Dialog } from '@base-ui/react/dialog';
import { X } from '@phosphor-icons/react';
import { NavButton } from '@ui/components/button/nav-button/nav-button';
import type { WithIcon } from '@ui/shared/types/with-icon';
import clsx from 'clsx';
import { type ReactNode, forwardRef } from 'react';

import styles from './modal.module.css';

import type { FooterVariant } from './types';

type ModalProps = React.DetailedHTMLProps<React.HTMLAttributes<HTMLDivElement>, HTMLDivElement> &
  Partial<WithIcon> & {
    /**
     * Title displayed in the modal header
     */
    title: string;
    /**
     * Optional subtitle displayed below the title
     */
    subtitle?: string;
    /**
     * Content to be displayed in the modal body
     */
    children?: ReactNode;
    /**
     * Content to be displayed in the modal footer
     */
    footer?: ReactNode;
    /**
     * Size variant of the modal
     */
    size?: 'regular' | 'large';
    /**
     * Variant of the footer styling
     */
    footerVariant?: FooterVariant;
    /**
     * Controls the visibility of the modal
     */
    open: boolean;
    /**
     * Callback function called when the modal is closed
     */
    onClose?: () => void;
  };

/**
 * A modal dialog component that appears on top of the main content,
 */
export const Modal = forwardRef<HTMLDivElement, ModalProps>(
  (
    {
      icon,
      title,
      subtitle,
      children,
      footer,
      size = 'regular',
      footerVariant = 'integrated',
      open,
      onClose,
      className,
      ...rest
    },
    ref,
  ) => {
    return (
      <Dialog.Root
        open={open}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            onClose?.();
          }
        }}
      >
        <Dialog.Portal>
          <Dialog.Backdrop className={styles['backdrop']} />
          <Dialog.Popup className={styles['modal-base']}>
            <div className={clsx(styles['modal'], styles[size], className)} ref={ref} {...rest}>
              <div className={styles['header']}>
                <div className={styles['title-wrapper']}>
                  {icon && <div className={styles['icon']}>{icon}</div>}
                  <div className={styles['title-container']}>
                    <Dialog.Title className={clsx(styles['title'], 'ax-public-h6')} render={<span />}>
                      {title}
                    </Dialog.Title>
                    {subtitle && (
                      <Dialog.Description className={clsx(styles['description'], 'ax-public-p11')} render={<span />}>
                        {subtitle}
                      </Dialog.Description>
                    )}
                  </div>
                </div>
                {onClose && (
                  <NavButton onClick={onClose}>
                    <X />
                  </NavButton>
                )}
              </div>

              {children && <div className={styles['content']}>{children}</div>}

              {footer && <div className={clsx(styles['footer'], styles[footerVariant])}>{footer}</div>}
            </div>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    );
  },
);
