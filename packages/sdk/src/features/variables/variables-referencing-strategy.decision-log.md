### Title: Variable Referencing Strategy

### Proposed by: Szymon Tondowski

### Date: 28.08.2026

## Context

Workflow Builder supports passing variables by typing '{{' in dedicated controls. To provide relevant variable suggestions, the application needs to recognize which variables are available within a given node and determine which types of variables (e.g. number, string, or date) are accepted by each control. Different controls may accept different variable types.

Variable suggestions for a given control depend on the global variables and the variables produced by previous nodes connected to it.

We need a robust mechanism for storing and accessing variable suggestions so that the picker can efficiently provide the relevant options whenever the user starts typing '{{'.

## Decisions

### 1. Precaching suggestions in dedicated store

Using an additional Zustand store to keep available variables by nodeId and sourceHandleId, allowing them to be collected using those parameters when the list of available variables is shown.

#### Consequences

##### Pros

- Improved Performance: Variables available further in the flow inherit values from previous nodes. This is an expensive operation that still needs to be calculated to collect the available suggestions, but the values themselves do not need to be recalculated (we take them from the store)
- Separation of Concerns: The complexity of determining which variables are available as outputs of a node and which should be shown for a control in another node is separated.
- Centralized State: We can preview the available suggestions without triggering a control search to build them. They can be inspected directly in Redux Toolkit DevTools or through a dedicated plugin that displays data for picked node
- Reusability: Different controls can consume the same suggestion data (we don't need to recalculate them)
- Scalability: The approach provides a foundation for supporting more complex variable availability and type rules in the future.

##### Cons

- Additional State Management: Introducing a dedicated store adds another layer of application state.
- Cache Invalidation: The store needs to ensure cached suggestions are updated when the workflow or available variables change.

##### Alternative Options Considered

1. **Calculating suggestions per control on focus**
   - **Pros:** No memory used for centralized state
   - **Cons:** Harder to debug, as it entangles the collection of variables from previous nodes with the dynamic process of building them

### 2. Target handles don't influence variable availability

The nature of the most common diagrams in Workflow Builder can result in different variables being provided by different source outputs of a node. For example, a condition node can provide different variables for the true and false branches. However, a potential implementation of a node with multiple incoming handles shouldn't affect the available variables in the sidebar, as they are all defined per field in the sidebar.

#### Consequences

##### Pros

- Simpler Implementation: The approach aligns with the current workflow design, where variables are defined and passed through fields in the sidebar rather than being determined dynamically by the graph structure.
- Separation of Concerns: Target handles are treated as connections that affect the node's execution flow, rather than as a mechanism for determining which variables are available to its inputs. Introducing this behavior would require additional complex logic in Workflow Builder or additional parsing logic in the engine.
- Built-in Type Checking and Validation: The current implementation requires users to provide compatible variables to sidebar inputs, where type checking and validation can ensure that the provided variables are valid. (We don't need to block edge creation because the value provided to the target handle has the wrong type)

##### Cons

- Limited Support for Database-Like Diagrams: This approach does not support diagrams where variables are passed between nodes through edges, similar to how data flows between nodes in database-like systems. In such cases, variables would need to be explicitly propagated through the graph rather than being defined per input field.

### 3. Special source-handle buckets in `bySourceHandle`

Besides entries keyed by real source handle ids, `bySourceHandle` accepts three optional bucket keys (`SPECIAL_SOURCE_HANDLE_KEYWORDS` in `constants.ts`): `every` is merged into every handle, `error` into handles whose id contains `error`, `success` into every other handle. None of them is required; a handle's own entry is always used on its own. The `error` check is a substring match on the handle id, so `onError` and `error-1` both count as error handles.

Suggestions from several buckets are merged per handle and de-duplicated by variable id. The type is taken from whichever copy survives; it is not resolved per handle. A variable that sits in more than one bucket must therefore declare the same type in each.

#### Consequences

##### Pros

- Nodes with a success / error split declare the shared part once in `every` and only the branch-specific properties per bucket.
- Handle ids stay free-form; a node author does not have to register handles anywhere else for the picker to work.

##### Cons

- A handle whose id happens to contain `error` is treated as an error handle even when it is not one.
- A type that differs between buckets for the same variable id is silently collapsed to one; nothing validates this at definition time.

## Status

Accepted
