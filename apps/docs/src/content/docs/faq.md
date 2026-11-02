---
title: FAQ
description: Frequently asked questions about Workflow Builder for developers.
---

## General

1. **What is Workflow Builder?**
   Workflow Builder is a React SDK for embedding a visual workflow editor in your own product, shipped with a Temporal plugin that runs the workflows your users draw durably on your own [Temporal](https://temporal.io), and an execution backend with versions, live run events and human decision steps. Pricing, permissions and the business logic of each node stay in your code.

2. **Is Workflow Builder a product or an SDK?**
   It is a white-label SDK, not a standalone SaaS product. The editor SDK and the Temporal plugin install from npm; the execution backend and AI Studio are open code in the repository. All of it becomes part of your application, runs on your infrastructure and can be customized to your domain.

3. **Who is Workflow Builder for?**
   Workflow Builder is built for SaaS companies adding workflow capabilities, AI/automation product teams, and engineering teams building visual configuration tools. It is not for end users looking for a ready-made automation tool.

4. **Why use Workflow Builder instead of building a workflow editor ourselves?**
   Building a basic drag-and-drop canvas takes days. Turning it into a production-ready workflow editor takes months. The complexity hides in details that only surface during real usage:
   - Edge routing that avoids overlapping nodes
   - Undo/redo across node moves, property edits, and connection changes
   - Keyboard shortcuts and accessibility (WCAG compliance)
   - State management that stays performant at hundreds of nodes
   - Serialization and deserialization with schema validation
   - A properties panel driven by configuration, not hardcoded per node type

   Workflow Builder ships all of this out of the box. You skip the infrastructure work and go straight to building the nodes and logic that are specific to your product.

5. **How is Workflow Builder different from n8n, Make, or Zapier?**
   n8n, Make, and Zapier are SaaS platforms with hosted execution for running workflows as a service. Their frontends are tightly coupled to their execution engines, databases, and APIs. You cannot extract the visual editor as a standalone component.

   Workflow Builder is a frontend SDK for teams building their own automation or AI-powered products. The editor is a React component inside your product, and the workflows it saves as JSON run on your own Temporal and Postgres, through the `@workflowbuilder/temporal` plugin and the execution backend. Nothing is hosted by us. The Community Edition is licensed under Apache 2.0. The Enterprise Edition uses a perpetual commercial license. Both editions allow embedding in your own product.

   If you need an embeddable editor and durable execution inside your own product, Workflow Builder gives you both without inheriting another product's architecture.

6. **How does Workflow Builder relate to React Flow?**
   Workflow Builder is built on top of [React Flow](https://reactflow.dev/) (@xyflow/react). It extends React Flow with a production-ready workflow editor layer: a node library, schema-driven properties panel, design system, serialization, and plugin architecture.

   If you've evaluated React Flow directly, Workflow Builder is the answer to "what would it take to turn React Flow into a shippable workflow editor." You keep full access to React Flow's API underneath - custom node renderers, viewport controls, edge routing - while starting from a complete editor rather than a blank canvas.

7. **What does the workflow JSON output look like?**
   Workflows serialize to a flat JSON structure with four fields:

   ```json
   {
     "name": "My Workflow",
     "layoutDirection": "DOWN",
     "nodes": [
       {
         "id": "440ccd46-...",
         "type": "node",
         "position": { "x": 18, "y": 144 },
         "data": {
           "properties": {
             "label": "Start Workflow",
             "title": "Trigger",
             "subtitle": "Initiate workflows"
           },
           "type": "trigger",
           "icon": "Lightning",
           "isStartNode": true
         }
       }
     ],
     "edges": [
       {
         "source": "440ccd46-...",
         "target": "da47caa9-...",
         "type": "labelEdge",
         "data": { "label": "Our website" }
       }
     ]
   }
   ```

   Node and edge types follow React Flow conventions. The `data.properties` object is where your custom per-node configuration lives - it is what the executor for that node type receives at run time. The optional `data.isStartNode` flag marks the node a run begins at, so the runner finds the entry point without inferring it from the graph shape or matching on a node type.

8. **How do I add custom nodes?**
   Custom nodes are React components registered via a JSON Schema definition. The schema drives the properties panel automatically - you define fields, validation rules, and defaults, and Workflow Builder generates the configuration UI. See the [Add Custom Node Type](/guides/add-a-custom-node/) guide for a step-by-step tutorial.

9. **How customizable is the UI?**
   Workflow Builder is a fully white-label SDK, so you can adjust:
   - Colors, typography, layout
   - Dark / light mode
   - Node visuals
   - Panels and controls

   Once embedded, Workflow Builder can look and feel like your branded product.

10. **Can Workflow Builder support AI agents?**
    Yes. Teams use it to design agent pipelines, prompt chains, decision trees, and tool-calling flows. You define custom node types for your AI operations (LLM calls, retrieval steps, tool use) and write one executor per node type, which can call any model or agent framework. Workflow Builder handles the visual modeling and configuration UI and, through the Temporal plugin, runs the flow durably with retries and timeouts per node type. A step can pause the run until a person approves, corrects or rejects the result, for minutes or for weeks, before anything irreversible happens. AI Studio, the demo app in the repository, runs six such templates.

## Technical

11. **How do I install Workflow Builder?**
    The editor SDK is on npm as `@workflowbuilder/sdk` and the Temporal plugin as `@workflowbuilder/temporal`; the execution backend, its Worker and AI Studio run from the repository. See the [Quick Start](/get-started/quick-start/standalone-app/) guide for the editor and [Run on Temporal](/guides/use-with-temporal/) for execution.

12. **What technologies and libraries are used?**
    Workflow Builder is built on a modern, modular tech stack:
    - **`@workflowbuilder/ui`** - our component library (built on the headless Base UI) for customizable, accessible UIs.
    - **JSONForms** - enables dynamic creation of node properties through JSON Schema.
    - **React** - the frontend library for building the editor UI.
    - **Zustand** - lightweight state management, integrated with React Flow.
    - **React Flow (xyflow)** - the diagramming library for the canvas.
    - **Temporal** - durable execution of the workflows, through the `@workflowbuilder/temporal` plugin. The execution backend is built on Hono and Postgres.

13. **Can workflows be created programmatically?**
    Yes. Because workflows are JSON, you can generate, modify, and version them programmatically via your APIs.

14. **How many nodes can the canvas handle?**
    For most workflow editors - up to a few hundred nodes - no special optimization is needed. Complex automation diagrams work well up to approximately 500 nodes.

    Performance depends on node complexity, edge count, routing strategy, and browser capability.

15. **Does Workflow Builder send data to external servers?**
    No. The editor SDK runs entirely in your application, and the execution backend, the Temporal Worker and the database run on your infrastructure, with your self-hosted Temporal or your Temporal Cloud account. Workflow Builder does not collect telemetry or send workflow data to any server of ours.

    This makes it suitable for environments with strict data residency requirements - healthcare, finance, government - where no third-party data processing is acceptable.

16. **Can the canvas, nodes, and panels be used independently?**
    Yes. Workflow Builder is built as a set of composable React components, not a monolithic application. You can use the canvas with your own sidebar, replace the properties panel with a custom implementation, or embed only specific components into an existing layout.

    Since you have the source code, you control which parts to use and which to replace. The plugin architecture provides defined extension points without requiring you to modify core components.

17. **What do we need to develop ourselves?**
    Workflow Builder handles the visual editor, the durable execution of the graph on Temporal (traversal, parallel branches, retries and timeouts per node type, pauses for human decisions) and an execution backend for versions, runs and live run events. You write one executor function per node type, with your AI calls and integrations, and you own billing and limits, permissions logic and deployment. The backend ships ports for your authentication and tenancy.

## Updates and Versioning

18. **What happens when a new major version is released?**
    Nothing changes until you upgrade. If you install the SDK from npm, you choose when to bump the dependency; follow the [changelog](https://github.com/synergycodes/workflowbuilder/blob/main/packages/sdk/CHANGELOG.md) and the [upgrade guide](/get-started/upgrade-to-3/) for breaking changes. If you maintain a fork of the source, review and merge upstream changes at your own pace.

19. **How do I prevent users from breaking production workflows?**
    Workflow Builder gives you the building blocks; safeguards are implemented on your side. Common patterns teams use:
    - Draft vs published versions: the execution backend ships this, and every run is pinned to the version it started with
    - Workflow locking
    - Role-based permissions controlling who can edit or publish
    - Backend validation before execution

    Because you own the source code and run the execution layer yourself, you decide which guardrails fit your product.

## Licensing

20. **What types of licenses do you offer?**
    Workflow Builder is available under two licensing models. Full ownership - OSS or perpetual license.
    - **Community Edition** - open source under the Apache 2.0 license, which allows commercial use.
    - **Enterprise Edition** - a production-ready, fully supported version built for organizations that need reliability, performance, and long-term scalability. Includes advanced features, dedicated support, customization options, and integration paths for real-world systems.

    This allows teams to start with the open-source edition and upgrade when their product requires advanced capabilities or enterprise support.

21. **Do we own the source code?**
    Yes. You can modify, extend, and maintain it.

22. **Is pricing subscription-based or one-time?**
    Enterprise is a one-time license fee (EUR 6,990). Community is free under Apache 2.0.

23. **Are there any usage limits or revenue sharing?**
    No built-in limits. No revenue sharing.

24. **Can we resell Workflow Builder as part of our SaaS?**
    Yes, under the commercial license.

25. **Is there a free trial or demo?**
    Yes — [open the editor demo](https://app.workflowbuilder.io) to try the editor in your browser, or [run a workflow in AI Studio](https://aistudio.workflowbuilder.io) to see a run end to end, with a human decision, no install and no sign-up. [Contact us](https://www.workflowbuilder.io/contact) for a guided walkthrough.

## See also

- [What is Workflow Builder?](/overview/) - what Workflow Builder is and who embeds it
- [Quick Start: Standalone App](/get-started/quick-start/standalone-app/) - run Workflow Builder as a self-hosted React app
- [Run on Temporal](/guides/use-with-temporal/) - run what people draw as durable Temporal Workflow Executions
- [Plugins](/plugins/) - optional plugins that extend Workflow Builder
