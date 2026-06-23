import {
  Accordion,
  Avatar,
  Button,
  Checkbox,
  DatePicker,
  IconSwitch,
  Input,
  Modal,
  Radio,
  SegmentPicker,
  Select,
  type SelectItem,
  Separator,
  Status,
  Switch,
  TextArea,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@workflowbuilder/ui';
import { type ReactNode, useState } from 'react';

import styles from './ui-showcase.module.css';

const AVATAR_IMAGE =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    "<svg xmlns='http://www.w3.org/2000/svg' width='96' height='96'><rect width='96' height='96' rx='48' fill='#4f46e5'/><text x='48' y='62' font-size='38' fill='white' text-anchor='middle' font-family='sans-serif'>AL</text></svg>",
  );

const SELECT_ITEMS: SelectItem[] = [
  { value: 'opus', label: 'Claude Opus' },
  { value: 'sonnet', label: 'Claude Sonnet' },
  { value: 'haiku', label: 'Claude Haiku' },
];

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className={styles.section}>
      <p className={styles.title}>{title}</p>
      <div className={styles.card}>{children}</div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className={styles.field}>
      <span className={styles.fieldLabel}>{label}</span>
      {children}
    </label>
  );
}

/**
 * Live gallery of `@workflowbuilder/ui` components, rendered as a React island
 * so the docs show the real, interactive components (not screenshots).
 */
export function UiShowcase() {
  const [switchOn, setSwitchOn] = useState(true);
  const [iconSwitchOn, setIconSwitchOn] = useState(false);
  const [checked, setChecked] = useState(true);
  const [radioValue, setRadioValue] = useState('weekly');
  const [inputValue, setInputValue] = useState('');
  const [areaValue, setAreaValue] = useState('');
  const [model, setModel] = useState<string | number | null>('opus');
  const [date, setDate] = useState<Date | null>(null);
  const [view, setView] = useState('list');
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div className={styles.showcase}>
      <Section title="Buttons">
        <Button variant="primary">Primary</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="gray">Gray</Button>
        <Button variant="success">Success</Button>
        <Button variant="warning">Warning</Button>
        <Button variant="error">Error</Button>
        <Button variant="primary" disabled>
          Disabled
        </Button>
      </Section>

      <Section title="Toggles">
        <Field label="Switch">
          <Switch checked={switchOn} onChange={(next) => setSwitchOn(next)} />
        </Field>
        <Field label="Icon switch">
          <IconSwitch
            checked={iconSwitchOn}
            onChange={(next) => setIconSwitchOn(next)}
            icon={<span>☀️</span>}
            IconChecked={<span>🌙</span>}
          />
        </Field>
        <Field label="Checkbox">
          <Checkbox checked={checked} onChange={(event) => setChecked(event.target.checked)} />
        </Field>
        <Field label="Radio group">
          <span style={{ display: 'flex', gap: '1rem' }}>
            {['daily', 'weekly', 'monthly'].map((value) => (
              <span key={value} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                <Radio
                  name="cadence"
                  value={value}
                  checked={radioValue === value}
                  onChange={() => setRadioValue(value)}
                />
                {value}
              </span>
            ))}
          </span>
        </Field>
        <Field label="Segment picker">
          <SegmentPicker value={view} onChange={(_event, next) => setView(next)}>
            <SegmentPicker.Item value="list">List</SegmentPicker.Item>
            <SegmentPicker.Item value="grid">Grid</SegmentPicker.Item>
            <SegmentPicker.Item value="board">Board</SegmentPicker.Item>
          </SegmentPicker>
        </Field>
      </Section>

      <Section title="Inputs">
        <div className={styles.stack}>
          <Field label="Text input">
            <Input
              placeholder="Type something"
              value={inputValue}
              onChange={(event) => setInputValue(event.target.value)}
            />
          </Field>
          <Field label="Error state">
            <Input placeholder="Invalid value" error value="not-an-email" readOnly />
          </Field>
          <Field label="Select">
            <Select
              items={SELECT_ITEMS}
              value={model}
              placeholder="Choose a model"
              onChange={(_event, next) => setModel(next)}
            />
          </Field>
          <Field label="Date picker">
            <DatePicker
              value={date ?? undefined}
              placeholder="dd/mm/yyyy"
              onChange={(next) => setDate((next as Date | null) ?? null)}
            />
          </Field>
          <Field label="Textarea">
            <TextArea
              placeholder="Multi-line input"
              value={areaValue}
              onChange={(event) => setAreaValue(event.target.value)}
            />
          </Field>
        </div>
      </Section>

      <Section title="Overlays">
        <Tooltip placement="top">
          <TooltipTrigger asChild>
            <Button variant="secondary">Hover for tooltip</Button>
          </TooltipTrigger>
          <TooltipContent tooltipType="default">Default tooltip</TooltipContent>
        </Tooltip>
        <Tooltip placement="top">
          <TooltipTrigger asChild>
            <Button variant="secondary">Hover for blue</Button>
          </TooltipTrigger>
          <TooltipContent tooltipType="blue">Blue tooltip</TooltipContent>
        </Tooltip>
        <Button variant="primary" onClick={() => setModalOpen(true)}>
          Open modal
        </Button>
        <Modal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          title="Example modal"
          subtitle="Rendered live from @workflowbuilder/ui"
          footer={
            <Button variant="primary" onClick={() => setModalOpen(false)}>
              Got it
            </Button>
          }
        >
          The backdrop and popup fade in and out via the Base UI transition lifecycle.
        </Modal>
      </Section>

      <Section title="Feedback & display">
        <Field label="Validation status">
          <Status status="invalid" />
        </Field>
        <Field label="Avatar">
          <Avatar username="Ada Lovelace" imageUrl={AVATAR_IMAGE} size="large" />
        </Field>
      </Section>

      <Section title="Layout">
        <div className={styles.stack}>
          <Accordion label="Accordion section" defaultOpen={false}>
            Content revealed when the section is expanded.
          </Accordion>
          <span>
            Above
            <Separator />
            Below
          </span>
        </div>
      </Section>
    </div>
  );
}
