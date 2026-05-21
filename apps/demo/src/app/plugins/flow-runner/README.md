# Flow runner

Example implementation of a JSON parser that returns a callable flow function `runFlow(startNodeId, [initialValue])`.

This parses the output exported from **WorkflowBuilder** (a list of nodes and edges in JSON) and can be implemented independently elsewhere. You can use WorkflowBuilder to create a diagram, save that diagram as JSON, and then convert that JSON into a runnable function somewhere else, for example on a Node server responsible for execution.

## Live demo

Go to https://app.workflowbuilder.io/ and pick a template, Ticket Pricing or Pension Simulation (you can select a template from the palette). You can also build your own flows using the nodes in the groups in palette.
