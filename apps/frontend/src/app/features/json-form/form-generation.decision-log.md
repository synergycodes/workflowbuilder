### Title: Dynamic form generation for node properties

### Proposed by: Jan Librowski

### Date: 05.02.2025

## Context

Customizing Workflow Builder for specific needs may involve adding a lot of node types. Usually each of them can be configured with a lot of different parameters that can be modified in properties sidebar. To speed up the development process and avoid crafting a dedicated properties component for each node type, handful of tools have been evaluated. Eventually we've decided to use a tool that would create forms out of a JSON based configuration.

## Decision

[JSONForms](jsonforms.io) was chosen as a base of our implementation. Its relatively simple API, wide adoption and comprehensive documentation made it a clear choice. It provides us with form generation, state management and validation capabilities. JSONForms offers simple ways to create controls and layouts. On top of it the library is framework-agnostic so potentially our implementation could be reused in other projects.

## Alternative Options Considered

- react-jsonschema-form - a tool offering pretty much the same functionalities as JSONForms, but it's more complex to use and its documentation is less clear.
- React Hook Form - it'd allow us to generate the React components for fields, but ultimately we'd need to include client code to customize the layout of node properties sidebar

## Consequences

- **Pros**

  - **JSON-based form generation** - allows use to store all node properties in a JSON configuration - thanks to it all relevant info can be stored on backend which makes managing available nodes in a palette and customizing their properties much easier.
  - JSONForms is **framework-agnostic** so our implementation can be reused in other projects
  - Implementation of nodes and customizations of properties will be **simple, unified and hopefully much faster**

- **Cons**
  - Generic form builder is yet another feature to maintain and its API will limit us sometimes when more complex behaviour is needed

## Status

Accepted
