# Flow runner

Example implementation of a JSON parser that returns a callable flow function `runFlow(startNodeId, [initialValue])`.

This parses the output exported from **WorkflowBuilder** (a list of nodes and edges in JSON) and can be implemented independently elsewhere. You can use WorkflowBuilder to create a diagram, save that diagram as JSON, and then convert that JSON into a runnable function somewhere else - for example, on a Node server responsible for execution.

## Good to know

Step = Node

## Directory content

- **callable-logic** - an example of external logic: in a real app, this could be where you handle tasks like sending an email or updating the database.
- **components** - the visual part of this example includes the nodes and the simulation controls inside the WorkflowBuilder.
- **core** - the core of the parser returns getFlowRunner, which in turn returns a function that runs the flow.
- **stores** - a debugger store used to visually debug the flow on the diagram.

## Short overview of the logic

- `/core/get-flow-runner.ts` - `getFlowRunner()` returns a callable `runFlow()`, that allows us to execute a flow.
- `/core/logic/get-flow-setup.ts` - builds the common cache and state for the runner; temporary states are kept inside it.
- `/core/logic/get-run-flow.ts` - This method builds a `runFlow` function, which executes the flow and manages the termination of waiting states for nodes, as well as the final responses of the main function.
- `/core/logic/get-run-flow-step.ts` - This function calls a dedicated method for a single node, collects and passes responses, and recursively calls itself if there are more steps.

### Important types

**CommonStepValue** is passed between steps. t is passed between steps. The flow runner assumes that each step works with the same response and can modify it.

**CallableAction** defines what is passed to and returned from the node callback function. These functions receive values from previous steps, values from the node (properties in the sidebar), and metadata about IDs and outgoing edges in the flow (they can choose which edges should be executed).
