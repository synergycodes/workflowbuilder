# Workflow Builder integration

There are a few ways you may want to integrate **Workflow Builder** with the rest of your system.

By default, Workflow Builder saves data to local storage. The `integration` prop of `<WorkflowBuilder.Root>` picks the strategy, and `/components/runtime-integration-wrapper.tsx` implements all three (`localStorage`, `api`, `props`).

This works well for a demo application but may not meet your needs of a real-world deployment.

### Should Workflow Builder operate as a standalone application or as part of an existing app?

#### 🌐 Standalone app - `index.html`

By default, Workflow Builder is a standalone app. You can build the application (`pnpm build`) and host it on your site. If this approach works for you, you can use the existing pnpm build process to deploy it.

#### 🧩 A component withing React application - `<WorkflowBuilder />`

Workflow Builder can function as a component within an existing React application. This allows you to integrate its functionality directly into your app rather than hosting it separately.

How to embed Workflow Builder in an existing React codebase: see the [React component quick-start](https://www.workflowbuilder.io/docs/get-started/quick-start/wb-as-react-component/), which covers installation from npm, usage, and configuration.

You can also build your application as an npm package and then simply consume it in your application.

### How should the Workflow Builder communicate with the rest of your system?

By default, data is saved to localStorage, which can make sense for some open apps where you export your diagrams to PDF or as an image.

#### 🌐 Workflow Builder working with API

If you wish to load and save diagrams from a specific endpoint, a solution is prepared for you. Pass `integration={{ strategy: 'api', endpoints: { load, save } }}` to `<WorkflowBuilder.Root>`.

The editor requests `load` once on mount and POSTs the diagram to `save` (the floppy disk, auto-save, or `save()` from `useWorkflowBuilderActions()`). If the load request fails, the editor refuses to save for the rest of that Root mount, so it never overwrites the copy on the server, and `onLoad` receives `loadFailed: true`.

#### 💠 Workflow Builder working with `{...props}`

You will usually want that with the `<Component />` solution (see the [React component quick-start](https://www.workflowbuilder.io/docs/get-started/quick-start/wb-as-react-component/)). Pass `integration={{ strategy: 'props', onDataSave }}` with `name`, `initialNodes` and `initialEdges`.

This is also a good approach if you decide to build the Workflow Builder as a package that will be installed in your React application.

#### 💾 Automatic saves

With every strategy the editor saves on its own after a change that comes more than 10 seconds after the last successful save, and when the tab closes, but only when the data the integration receives differs from what was loaded or last saved successfully. `IntegrationContextWrapper` compares that data, serialised, with a snapshot the integration store records on load and on each successful save. Pass `autoSave: false` on the integration to turn both automatic saves off; the floppy disk and `save()` still write.
