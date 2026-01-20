<img alt="Workflow Builder" src="https://cdn.synergycodes.com/workflow-builder-logo-solid.svg" width="201" height="40">

## What is Workflow Builder?

Workflow Builder is an open-source, frontend-only SDK for building and embedding visual workflow editors into your application.

It provides a ready-made workflow editor UI - including canvas, nodes, edges, layout and configuration panels - so you don’t have to build workflow UX from scratch.

Workflow Builder focuses exclusively on the **frontend editor layer**.  
Execution, orchestration, and business logic remain fully under your control.

## What Workflow Builder is NOT

Workflow Builder does **not**:
- execute workflows
- provide scheduling or orchestration
- include backend logic or integrations
- act as an iPaaS or automation platform

The SDK outputs workflow definitions (JSON) that are meant to be executed by **your own backend**.

## Key features

- Visual workflow editor (nodes, edges, layout, validation)
- Configurable and extensible node system
- Schema-driven properties panels
- Workflow serialization to JSON
- Plugin-first architecture
- Back-end agnostic
- Designed for embedding into SaaS products
- Theming and white-label support
- Design System Kit

## Typical use cases

Workflow Builder is commonly used to:
- embed workflow editors into B2B SaaS products
- build visual rule engines and configuration tools
- design AI agent and automation workflow platforms
- serve as a foundation for workflow-driven products and standalone apps

[![Build](https://github.com/synergycodes/workflowbuilder/actions/workflows/build.yml/badge.svg)](https://github.com/synergycodes/workflowbuilder/actions/workflows/build.yml)

## <a name="about-the-project">About The Project</a>

Monorepo of [Workflow Builder](https://www.workflowbuilder.io/) - a frontend-first SDK and foundation for building workflow-driven applications.

## <a name="getting-started">Getting Started</a>

### <a name="prerequisites">Prerequisites</a>

You'll need `node` and `pnpm` with proper versions set in the root `package.json` and `.npmrc` file.

### <a name="installation">Installation</a>

1. Clone the repo
2. Install packages from the root directory
   `pnpm i`
3. To start the app, run
   `pnpm dev`

### <a name="technical-overview">Technical Overview</a>

Using `pnpm workspaces` Workflow Builder is split into packages placed in `apps/` directory:

- [`frontend`](./apps/frontend/README.md) - React app containing the core functionality of Workflow Builder
- [`frontend-e2e`](./apps/frontend-e2e/README.md) - E2E tests for the frontend
- [`types`](./apps/types/README.md) - Shared Typescript definitions for the project
- [`icons`](./apps/icons/README.md) - Lazy-loadable, extensible icons

## <a name="decision-logs">Decision Logs</a>

To document technical choices and provide an overview of reasoning behind them, the repo contains `*.decision-log.md` files that live along the code and packages their related to. See [decision logs list](./DECISION-LOGS.md)

## License

Community Edition:
- Open source
- Apache 2.0 license
- Frontend-only workflow editor SDK

Enterprise Edition:
- Commercial license
- Long-term support
- Advanced features and professional services
  
## Contributing
Workflow Builder is open-source and we welcome contributions. Whether you're fixing bugs, proposing features, improving docs, or spreading the word - we'd love to have you as part of the community.

## Professional consulting & enterprise support
Workflow Builder is a frontend-only SDK. For enterprise companies that need end-to-end implementations, we also offer professional consulting services.
Our team can help with:
- backend execution engines
- custom integrations
- enterprise-grade customization and scaling
- accelerating time-to-market with proven architecture patterns
The team behind Workflow Builder has 15+ years of experience building enterprise-class diagramming and automation tools.
Learn more about Enterprise Edition and consulting: 👉 https://workflowbuilder.io

## <a name="links">Links</a>

- [Product website](https://www.workflowbuilder.io/)
- [Try interactive sample demo](https://app.workflowbuilder.io/)
