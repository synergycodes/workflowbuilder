# @workflowbuilder/ui

A React library for creating node-based user interfaces and diagram-driven apps. Built to work seamlessly with React Flow, it provides a collection of ready-to-use components and templates that simplify the development of visual editors, workflows, and interactive diagrams.

Developed and maintained by **[Synergy Codes](https://www.synergycodes.com/)**.

## Quick Start: 3-Minute Guide

### 📦 Installation

Use one of the commands below to add **Overflow UI** to your project:

```bash
npm install @workflowbuilder/ui
```

```bash
pnpm add @workflowbuilder/ui
```

```bash
yarn add @workflowbuilder/ui
```

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

Forget cobbling together UI kits with diagram libraries. Overflow UI provides a unified set of designed, ready-to-use components: buttons, inputs, accordions, node templates, and more — all built to work seamlessly together.

## Features

- Unified Component System: Seamlessly integrated UI and diagram components
- Ready-to-use Components: Comprehensive set of pre-built components
- Token-based Customization: Easy theming through CSS variables
- Developer-friendly: Focus on developer experience and productivity
- React Flow Compatible: Perfect for React Flow users with pre-built node templates that match React Flow's styling

## Customization

Each Overflow UI component uses CSS variables that are derived from primitive values.

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

### Overflow UI css layers

Overflow UI uses [CSS layers](https://developer.mozilla.org/en-US/docs/Web/CSS/@layer) to separate its styles from yours. By default, CSS styles outside of any layer take precedence over what Overflow UI defines, so your styles will always win the specificity war. You can customize Overflow UI components with simple `input {}`.

```css
@layer ui.component {
  .separator {
    /* … */
  }
}
```

Default Overflow UI order:

```css
@layer ui.base, ui.component;
```

# 🛠️ Development

To develop and test components, follow these steps in monorepo root:

1. Install dependencies:

```bash
pnpm i
```

2. Build UI:

```bash
pnpm ui build
```

3. Run preview page:

```bash
pnpm ui preview
```

Now visit `localhost:3000` to see every change in components reflected in the preview page.
Edit `ui/preview-page/preview-page.tsx` to display desired components.

### 📣 Important Note on Underlying Technology

> **Overflow UI is built on top of [Base UI](https://base-ui.com), a headless component library that focuses on accessibility and logic, while leaving the styling up to us.**
>
> Thanks to Base UI, Overflow UI provides components that are **accessible by default** and **fully customizable** through our design tokens.
>
> Earlier `1.0.0` betas were built on the now-deprecated [MUI Base](https://v6.mui.com/base-ui/getting-started/). From `1.0.0-beta.28` the library is built on Base UI; see [CHANGELOG.md](./CHANGELOG.md) for the full list of changes.

## Showcase

**[Workflow Builder](https://www.workflowbuilder.io/)** is a frontend-focused starter app for building workflows, offering core features, best practices, and easy backend integration for faster client delivery.

https://www.workflowbuilder.io/
