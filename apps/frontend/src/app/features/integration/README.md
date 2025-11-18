# Workflow Builder integration

There are a few ways you may want to integrate **Workflow Builder** with the rest of your system.

By default, Workflow Builder is a standalone app and saves data to local storage (check: `/components/integration-variants/with-integration-through-local-storage.tsx`).

This works well for a demo application but may not meet your needs of a real-world deployment.

### Should Workflow Builder operate as a standalone application or as part of an existing app?

#### 🌐 Standalone app - `index.html`

By default, Workflow Builder is a standalone app. You can build the application (`pnpm build`) and host it on your site. If this approach works for you, you can use the existing pnpm build process to deploy it.

#### 🧩 A component withing React application - `<WorkflowBuilder />`

Workflow Builder can function as a component within an existing React application. This allows you to integrate its functionality directly into your app rather than hosting it separately.

How to migrate the Workflow Builder into an existing React codebase: `docs/using-app-as-component.md`.

You can also build your application as an npm package and then simply consume it in your application.

### How should the Workflow Builder communicate with the rest of your system?

By default, data is saved to localStorage, which can make sense for some open apps where you export your diagrams to PDF or as an image.

#### 🌐 Workflow Builder working with API

If you wish to load and save diagrams from a specific endpoint, a solution is prepared for you. Switch the strategy to .API in `/components/with-integration.tsx`.

After you switch, you can save the diagram (by clicking the floppy disk) and check the Network tab in your console. The request will go to non-existing endpoints, but the implementation is in place.

You can check it here `/components/integration-variants/with-integration-through-api.tsx`.

#### 💠 Workflow Builder working with `{...props}`

You will usually want that with the `<Component />` solution (`docs/using-app-as-component.md`). Switch the strategy to .PROPS in `/components/with-integration.tsx`.

This is also a good approach if you decide to build the Workflow Builder as a package that will be installed in your React application.
