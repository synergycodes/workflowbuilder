/**
 * The documented component surface: which UI components get generated Props /
 * CSS variables tables, which prop type each one exposes, and where its source
 * lives under packages/ui/src/components.
 *
 * Imported by both the generator and the coverage guard, so the guard can
 * never disagree with the generator about what is documented.
 */
// `propsType`: the exported prop type, a list of variant types, or null when
// the parts are described in prose. `dir`: the folder under
// packages/ui/src/components, or null for an entry that owns no stylesheet.
export const COMPONENTS = [
  { slug: 'accordion', name: 'Accordion', propsType: 'AccordionProps', dir: 'accordion' },
  { slug: 'avatar', name: 'Avatar', propsType: 'AvatarProps', dir: 'avatar' },
  { slug: 'button', name: 'Button', propsType: ['LabelButtonProps', 'IconButtonProps'], dir: 'button' },
  { slug: 'checkbox', name: 'Checkbox', propsType: 'CheckboxProps', dir: 'checkbox' },
  { slug: 'chip', name: 'Chip', propsType: 'ChipProps', dir: 'chip' },
  { slug: 'collapsible', name: 'Collapsible', propsType: 'CollapsibleProps', dir: 'collapsible' },
  { slug: 'date-picker', name: 'DatePicker', propsType: 'DatePickerProps', dir: 'date-picker' },
  { slug: 'icon-switch', name: 'IconSwitch', propsType: 'IconSwitchProps', dir: 'switch/icon-switch' },
  {
    slug: 'input',
    name: 'Input',
    propsType: 'InputProps',
    dir: 'input',
    cssSources: [
      'shared/components/field/field.module.css',
      'shared/styles/field-control-height.module.css',
      'shared/styles/field-control-size.module.css',
    ],
  },
  { slug: 'menu', name: 'Menu', propsType: 'MenuProps', dir: 'menu' },
  {
    slug: 'menu-trigger-button',
    name: 'MenuTriggerButton',
    propsType: 'MenuTriggerButtonProps',
    dir: 'button/menu-trigger-button',
  },
  { slug: 'modal', name: 'Modal', propsType: 'ModalProps', dir: 'modal' },
  {
    slug: 'nav-button',
    name: 'NavButton',
    propsType: ['NavLabelButtonProps', 'NavIconButtonProps'],
    dir: 'button/nav-button',
  },
  { slug: 'radio', name: 'Radio', propsType: 'RadioProps', dir: 'radio-button' },
  {
    slug: 'segment-picker',
    name: 'SegmentPicker',
    propsType: ['ControlledSegmentPickerProps', 'UncontrolledSegmentPickerProps'],
    dir: 'segment-picker',
  },
  { slug: 'select', name: 'Select', propsType: 'SelectBaseProps', dir: 'select' },
  { slug: 'separator', name: 'Separator', propsType: null, dir: 'separator' },
  { slug: 'snackbar', name: 'Snackbar', propsType: 'SnackbarProps', dir: 'snackbar' },
  { slug: 'status', name: 'Status', propsType: 'StatusProps', dir: 'status' },
  { slug: 'switch', name: 'Switch', propsType: 'BaseSwitchProps', dir: 'switch' },
  {
    slug: 'text-area',
    name: 'TextArea',
    propsType: 'TextAreaProps',
    dir: 'text-area',
    cssSources: ['shared/components/field/field.module.css', 'shared/styles/field-control-size.module.css'],
  },
  { slug: 'tooltip', name: 'Tooltip', propsType: 'TooltipProps', dir: 'tooltip' },
  // Diagram components.
  { slug: 'node-icon', name: 'NodeIcon', propsType: 'NodeIconProps', dir: 'node/node-icon' },
  {
    slug: 'node-description',
    name: 'NodeDescription',
    propsType: 'NodeDescriptionProps',
    dir: 'node/node-description',
  },
  {
    slug: 'node-as-port-wrapper',
    name: 'NodeAsPortWrapper',
    propsType: 'NodeAsPortWrapperProps',
    dir: 'node/node-as-port-wrapper',
  },
  { slug: 'edge', name: 'EdgeLabel', propsType: 'EdgeLabelProps', dir: 'edge' },
  // Documented on the Edge page, which already renders the edge variables.
  { slug: 'use-edge-style', name: 'useEdgeStyle', propsType: 'UseEdgeStyleParams', dir: null },
  // Compound component - parts described in prose, variables generated.
  { slug: 'node-panel', name: 'NodePanel', propsType: null, dir: 'node/node-panel' },
];
