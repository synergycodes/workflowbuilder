# @workflowbuilder/ui

Workflow Builder's component library: accessible, themeable React UI primitives - button, input, select, modal, menu, date picker, switch, tooltip, and more - built on [Base UI](https://base-ui.com), plus diagram building blocks (node and edge parts) for visual editors.

Developed and maintained by **[Synergy Codes](https://www.synergycodes.com/)**.

## Quick Start: 3-Minute Guide

### 📦 Installation

Use one of the commands below to add **`@workflowbuilder/ui`** to your project:

```bash
npm install @workflowbuilder/ui
```

```bash
pnpm add @workflowbuilder/ui
```

```bash
yarn add @workflowbuilder/ui
```

> **Peers &amp; dependencies.** The only peer dependencies are `react` and
> `react-dom` (bring your own). `@base-ui/react` is a regular dependency pinned
> to the `1.4.x` line (later versions regressed dialog/menu/tooltip transitions),
> so it installs automatically — no need to add it yourself. The heavier
> component dependencies (date-fns, react-day-picker, clsx, Phosphor icons) are
> bundled into the package; `react-textarea-autosize` and `@base-ui/react` are
> the only ones resolved from your `node_modules`.

### 🎨 Import styles

Import components from the package root (the recommended default). Their styles,
including the global layer order, reset, and typography, are injected
automatically, so you only need to add the design tokens:

```css
@import '@workflowbuilder/ui/tokens.css';
```

```tsx
import '@workflowbuilder/ui/tokens.css';
```

> **Subpath imports.** You can also import a single component directly, e.g.
> `import { DatePicker } from '@workflowbuilder/ui/date-picker'`. That
> injects only the component's own CSS, so import the global stylesheet once and
> **before any component**, so the cascade layers are ordered correctly:
> `import '@workflowbuilder/ui/styles.css'`.

### 🎛️ Apply the Theme

To make the styles use proper variables, include data-theme (light or dark) attribute in <html>:

```html
<html data-theme="light"></html>
```

### 🧱 Use components

```tsx
import { Input } from '@workflowbuilder/ui';

// …

<Input value={value} onChange={onChange} />;
```

## Overview

Forget cobbling together UI kits with diagram libraries. `@workflowbuilder/ui` provides a unified set of designed, ready-to-use components: buttons, inputs, accordions, node templates, and more — all built to work seamlessly together.

## Features

- Unified Component System: Seamlessly integrated UI and diagram components
- Ready-to-use Components: Comprehensive set of pre-built components
- Token-based Customization: Easy theming through CSS variables
- Developer-friendly: Focus on developer experience and productivity
- React Flow Compatible: Perfect for React Flow users with pre-built node templates that match React Flow's styling

## Customization

Each `@workflowbuilder/ui` component uses CSS variables that are derived from primitive values.

You can override them:

```css
:root {
  --ax-ui-bg-primary-default: #40ba12;
}
```

or a derived value used by the selected component:

```css
:root {
  --ax-public-date-picker-dropdown-background: #40ba12;
}
```

### `@workflowbuilder/ui` css layers

`@workflowbuilder/ui` uses [CSS layers](https://developer.mozilla.org/en-US/docs/Web/CSS/@layer) to separate its styles from yours. By default, CSS styles outside of any layer take precedence over what `@workflowbuilder/ui` defines, so your styles will always win the specificity war. You can customize `@workflowbuilder/ui` components with simple `input {}`.

```css
@layer ui.component {
  .separator {
    /* … */
  }
}
```

Default `@workflowbuilder/ui` order:

```css
@layer ui.base, ui.component;
```

# 🛠️ Development

Run these from the monorepo root.

Install dependencies:

```bash
pnpm i
```

Build the library (runs the built-CSS guard afterwards):

```bash
pnpm --filter @workflowbuilder/ui build
```

Rebuild on change while developing:

```bash
pnpm --filter @workflowbuilder/ui dev
```

Run the unit tests:

```bash
pnpm --filter @workflowbuilder/ui test
```

To see components rendered live, start the documentation site with `pnpm dev:docs` and open its UI Library gallery.

### 📣 Important Note on Underlying Technology

> **`@workflowbuilder/ui` is built on top of [Base UI](https://base-ui.com), a headless component library that focuses on accessibility and logic, while leaving the styling up to us.**
>
> Thanks to Base UI, `@workflowbuilder/ui` provides components that are **accessible by default** and **fully customizable** through our design tokens.
>
> Earlier `1.0.0` betas were built on the now-deprecated [MUI Base](https://v6.mui.com/base-ui/getting-started/). From `1.0.0-beta.28` the library is built on Base UI; see [CHANGELOG.md](./CHANGELOG.md) for the full list of changes.

## Showcase

**[Workflow Builder](https://www.workflowbuilder.io/)** is a frontend-focused starter app for building workflows, offering core features, best practices, and easy backend integration for faster client delivery.

https://www.workflowbuilder.io/
