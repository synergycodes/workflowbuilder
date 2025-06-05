### Title: Using Web Components for Framework-Agnostic Integration

### Proposed by: Piotr Błaszczyk 

### Date:  03.02.2025

## Context  
Workflow Builder is built using React, but there may be cases where it needs to be embedded within applications built with different frameworks, such as Angular or Vue. A Web Component wrapper provides a standardized way to integrate Workflow Builder into various environments without being tied to a specific framework. However, since there is no immediate requirement, implementing this solution now would add unnecessary complexity.

## Decision  
Rather than implementing a Web Component wrapper preventively, we will document the process for future use. If integration with another framework becomes necessary, we can follow this approach.

## Implementation Steps  
To package Workflow Builder as a Web Component and make it installable via npm, the following changes need to be made:  

### 1. Modify `main.tsx`  

Currently, the React application assumes direct control over an HTML element (#root), making it tightly coupled with the index.html structure. We need to transform it into a Web Component so it can be embedded anywhere without modifying the host application’s DOM structure.

Replace:  
```typescript
const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement,
);

root.render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```  
With:  
```typescript
class WorkflowBuilder extends HTMLElement {
  private root: ReactDOM.Root | null = null;

  connectedCallback() {
    if (!this.root) {
      const container = document.createElement('div');
      this.appendChild(container);

      this.root = ReactDOM.createRoot(container);
      this.root.render(
        <StrictMode>
          <App />
        </StrictMode>,
      );
    }
  }

  disconnectedCallback() {
    if (this.root) {
      this.root.unmount();
      this.root = null;
    }
  }
}

customElements.define('workflow-builder', WorkflowBuilder);
```  

### 2. Update `index.html`  

The original index.html expected a specific div with an id="root", which tied the application to a fixed element. By replacing it with a Web Component, we enable framework-agnostic integration.

Replace:  
```html
<div id="root"></div>
```  
With:  
```html
<workflow-builder></workflow-builder>
```  

### 3. Configure Vite for Library Mode  

Adjusting the `vite.config.mts` ensures that our Web Component can be bundled as an npm package.

Update `vite.config.mts`:
```typescript
export default defineConfig(({ mode }) => ({
  //...
  build: {
    lib: {
      entry: path.resolve(__dirname, './src/main.tsx'),
      name: 'WorkflowBuilder',
      fileName: (format) => `workflow-builder.${format}.js`,
      formats: ['es', 'umd'],
    },
    outDir: 'dist/package',
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify(
      process.env.NODE_ENV || 'development',
    ),
  },
  //...
}));
```  

### 4. Create an `npm` Package  
After building the project, ensure that a `package.json` file is added inside the `dist/package` folder. Example:  
```json
{
  "name": "workflow-builder",
  "version": "1.0.0",
  "description": "Workflow Builder app",
  "main": "workflow-builder.umd.js",
  "module": "workflow-builder.es.js",
  "style": "frontend.css",
  "author": "SynergyCodes",
  "peerDependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "dependencies": {},
  "files": [
    "workflow-builder.umd.js",
    "workflow-builder.es.js",
    "frontend.css"
  ]
}
```  

## Alternative Options Considered

Before deciding on Web Components, other integration approaches were evaluated:  

1. **iFrame-based Embedding**  
   - **Pros:** Fully isolates WorkflowBuilder, ensuring no conflicts with the host application.  
   - **Cons:** Limited interaction capabilities, potential security concerns, and styling constraints.  

2. **Direct API-Based Integration (eg. @angular/react, react2angular)**  
   - **Pros:** Allows for deep integration with the host application.  
   - **Cons:** Requires maintaining separate framework-specific wrappers, leading to increased complexity.  

3. **Module Federation (Micro Frontend Approach)**  
   - **Pros:** Enables dynamic imports and runtime sharing of dependencies.  
   - **Cons:** Requires the host application to support Webpack Module Federation, limiting compatibility.  

### Why Web Components?  
Web Components provides the best balance between independence, ease of integration, and long-term maintainability. The React app will remain fully functional with its existing build tool, while the host app will seamlessly consume it as a reusable component. This ensures:

-	**Modularity:** The React app can evolve independently of the host.
-	**Ease of use:** No need for significant changes to the host app’s build tool configuration.
-	**Standardized API:** Exposes a well-defined interface through properties, events, and methods.

## Consequences  
- **Pros**  
  - Avoids premature development effort.  
  - Keeps the React codebase clean until integration is necessary.  
  - Provides a clear strategy when the need arises.  
- **Cons**  
  - Future integrations may require additional work at the time of implementation.  

## Status  
Accepted
