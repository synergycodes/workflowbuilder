import { Cube, Info } from '@phosphor-icons/react';
import { type DiagramModel, useFitView, useStore } from '@workflowbuilder/sdk';
import { Modal } from '@workflowbuilder/ui';
import clsx from 'clsx';
import { useId, useRef } from 'react';

import styles from './welcome-modal.module.css';

import { InlineMessage } from './inline-message';
import type { TemplatePickerVariant } from './template-picker-store';
import { TemplateTile } from './template-tile';
import { welcomeTemplates } from './welcome-templates';

type Props = {
  variant: TemplatePickerVariant;
  open: boolean;
  onClose: () => void;
};

const HEADER = {
  welcome: { title: 'Welcome to AI Studio', icon: Info, subheading: 'How do you want to start?' },
  select: { title: 'Select a template', icon: Cube, subheading: 'Available templates' },
} as const;

export function WelcomeModal({ variant, open, onClose }: Props) {
  const setDiagramModel = useStore((store) => store.setDiagramModel);
  const hasBlocks = useStore((store) => store.nodes.length > 0);
  const fitView = useFitView();
  const dialogRef = useRef<HTMLDivElement>(null);
  const descriptionId = useId();
  const subheadingId = useId();
  const { title, icon: HeaderIcon, subheading } = HEADER[variant];
  const isWelcome = variant === 'welcome';
  // Over an empty canvas nothing can be lost, so Select a template shows no warning (as the prototype does).
  const showsWarning = !isWelcome && hasBlocks;

  // The calls the SDK's own template modal makes; without a model the canvas is cleared.
  function start(model?: DiagramModel) {
    setDiagramModel(model);
    fitView();
    onClose();
  }

  return (
    <Modal
      ref={dialogRef}
      initialFocus={dialogRef}
      open={open}
      onClose={onClose}
      size="large"
      title={title}
      icon={<HeaderIcon className={styles['header-icon']} aria-hidden="true" />}
      className={styles['modal']}
      aria-describedby={isWelcome || showsWarning ? descriptionId : undefined}
    >
      <div className={styles['body']}>
        {isWelcome ? (
          <div className={styles['intro']}>
            <p id={descriptionId} className={clsx('wb-text-body-m', styles['lead'])}>
              A live demo of <strong className="wb-text-body-m-emphasized">Workflow Builder</strong> – a toolkit for
              building visual workflow editors with AI.
            </p>
            <InlineMessage tone="info">
              Runs are real (AI steps call a live model via{' '}
              <strong className="wb-text-body-s-emphasized">OpenRouter</strong>), so their number is limited – this is a
              place to see what you can build, not to benchmark models. Anyone with a run&apos;s link can see and act on
              it, so do not enter personal data.
            </InlineMessage>
          </div>
        ) : (
          showsWarning && (
            <InlineMessage tone="warning" id={descriptionId}>
              Starting a new template replaces your current workflow. There is no way back to the workflow you built —
              this cannot be undone.
            </InlineMessage>
          )
        )}
        <div className={styles['start']}>
          <h2 id={subheadingId} className={clsx('wb-text-title-s-emphasized', styles['subheading'])}>
            {subheading}
          </h2>
          <div role="group" aria-labelledby={subheadingId} className={styles['grid']}>
            {welcomeTemplates.map(({ template, description, icon, category, recommended }) => (
              <TemplateTile
                key={template.name}
                kind="template"
                title={template.name}
                description={description}
                icon={icon}
                category={category}
                recommended={isWelcome && recommended}
                onClick={() => start(template.value)}
              />
            ))}
            <TemplateTile
              kind="empty"
              title="Empty canvas"
              description="Start from scratch — add the trigger and blocks yourself."
              onClick={() => start()}
            />
          </div>
        </div>
      </div>
    </Modal>
  );
}
