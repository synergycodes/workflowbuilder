### Title: JSON Form Validation Strategy

### Proposed by: Piotr Błaszczyk

### Date: 26.05.2025

## Context

In the JSON Form implementation, we faced a challenge in managing **validation** in combination with the **UI schema** that defines visibility and enable/disable conditions for controls. Specifically:

* The **UI schema rules** (like disabling or hiding controls) are primarily for UI rendering. They inform the renderer when to disable or hide controls based on certain conditions but are not directly connected to the **validation** process.
* **Validation** operates strictly on the **JSON Schema** and does not consider UI state (e.g., whether a field is visible or hidden).
* The built-in `isVisible` method from the JSON Forms core exists but:

  * Requires complex logic to pass and calculate all necessary props.
  * Can lead to a **tight coupling** of validation and visibility logic.
  * Makes external validation (e.g., using AJV outside the form) difficult since it would require replicating the same calculations.
  * Reference: [JSON Forms Forum - Clearing Hidden Fields](https://jsonforms.discourse.group/t/clearing-hidden-fields/234) — highlights the challenges of managing hidden fields.

## Decision

### Separation of Concerns

We decided to **fully separate validation from UI state**. This means:

* **Validation is driven solely by the JSON Schema**.
* **Visibility/Enablement logic is handled by the UI schema** and evaluated during rendering.
* The schema may use `if/else/then` constructs to define conditional validation logic directly within the JSON Schema itself:

  * This allows defining precisely **what** should be validated **and when**.
  * Visibility or enablement state of a field **does not affect validation**—even if a field is hidden or disabled, its data is still validated according to the schema.

### Benefits of this Approach

* **Simplicity**: No additional logic or calculations are required in the codebase to sync validation with visibility rules.
* **Decoupled Design**: Keeps validation rules centralized in the schema and UI logic in the renderer.
* **Flexibility**: Allows easy validation outside JSON Form (e.g., in API endpoints, batch processing) by reusing the schema with a standard AJV validator.
* **Maintainability**: Easier to understand and modify validation rules without needing to manage complex interdependencies between schema and UI.

## Rejected Alternatives

### 1️⃣ Using the built-in `isVisible` logic to "skip" validation for hidden/disabled fields

* Considered too complex, requiring significant boilerplate and duplication.
* Coupled visibility rules and validation in a way that complicates external schema validation.
* Adds overhead in maintaining correct visibility checks across the system.

### 2️⃣ **React Context for Visible Paths**

* Idea: Wrap the JSON Form with a **React Context** that exposes a **ref** storing the set of visible paths.
* The `ControlWrapper` would register its path in the visible set during rendering.
* This would allow filtering validation errors and props based on the current visibility state.
* However:

  * It introduces additional complexity and tight coupling between the UI and validation logic.
  * Extends the JSON Form behavior in a non-standard way, which might be hard to maintain.
  * **Cannot be reused outside the JSON Form context**, limiting schema portability and external validation.
  * It still doesn't feel like a **clean** separation of concerns.

## Future Considerations

* For advanced use cases where visibility and validation must interact, we may explore JSON Schema extensions or preprocessing layers to dynamically generate schemas based on UI rules.
* **External Validation**: The current design fully supports using **AJV** outside the form, aligning with the goal of schema reusability.

## Consequences

* Developers must maintain **separate rules**:

  * **UI schema** for visibility and enablement.
  * **JSON schema** for validation.
* Validation will **always run**, regardless of visibility or state of fields in the UI.
* The team must remain disciplined in ensuring the logic in both schemas aligns conceptually (e.g., a hidden field might still be required).

## Status

Accepted
