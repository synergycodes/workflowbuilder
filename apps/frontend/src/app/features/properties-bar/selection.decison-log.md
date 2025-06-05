# Selection State Management in ReactFlow

### Proposed by: Piotr Błaszczyk/Wojciech Świątek

### Date: 06.05.2025

## Context

ReactFlow provides an `onSelectionChange` callback that returns selected nodes and edges. However, these objects are not always up to date—when underlying data changes, the callback may still return outdated references. In this application, it is critical to have up-to-date selection data for features such as the properties sidebar.

## Decision

1. **Selection Storage Strategy**

   - Selection is stored in a **Zustand store** as two separate ID lists:
     - `selectedNodesIds`
     - `selectedEdgesIds`
   - These values are updated in the `onSelectionChange` callback of ReactFlow.
   - This approach ensures consistent behavior across all selection types (single, multi, box-selection), and maintains one-way data flow from the canvas to the store.

2. **Handling Outdated Data from ReactFlow**

   - ReactFlow's `onSelectionChange` provides outdated object references when node/edge data is updated.
   - To work around this, a **custom hook** `useSingleSelectedElement` was introduced:
     - It computes the selected node or edge using the current state and selection IDs.
     - It returns **only one object** (node or edge) because it is currently used only by the properties sidebar.
     - The hook includes a **custom comparison function** to minimize unnecessary re-renders for performance.

3. **Rejected Alternatives**

   - `zustand-middleware-computed-state`: This helper (or similar) allowed computing derived state (e.g., selected elements) but **lacked support for custom comparison functions**, making it inefficient for large diagrams. Also it adds unnecessary complexity to the store.
   - Custom middleware in Zustand: Though technically possible to handle selection updates via middleware, it was rejected due to its **implicit nature** and lack of alignment with standard React paradigms.

4. **Future Considerations**
   - If ReactFlow improves the `onSelectionChange` API to always return **updated objects**, the selection implementation can be simplified.
   - At that point, storing full object references in the Zustand store would be feasible without requiring sync mechanisms.

## Additional Improvement Idea

- As a potential optimization, **nodes and edges could be stored in Zustand as `Map<string, element>`** for faster access.
  - If stored as a **separate collection**, it would require synchronization with the array-based `nodes` and `edges`, increasing complexity.
  - If used to **replace** the array-based storage entirely, data would need to be **converted back to arrays** before passing to ReactFlow.
  - Both approaches introduce drawbacks—so for now, we continue using **simple `find` operations** on the array to retrieve selected elements.

## Consequences

- **Up-to-date Data**: Current implementation ensures selection data used in the UI is always current and reflects the latest model changes.
- **Performance**: Custom comparison logic avoids unnecessary updates, keeping UI performance optimal even with large diagrams.
- **Scalability**: The `useSingleSelectedElement` hook can be extended to support bulk selections when the sidebar is enhanced for multi-editing.

## Status

Accepted
