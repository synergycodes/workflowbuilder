---
title: Node schemas
description: The two declarative halves that define a custom node — its data schema and the form rendered in the property panel.
sidebar:
  order: 1
---

A node is described by two declarative files. Together they define what the node stores and how it's edited:

| File          | Purpose                                                                              |
| ------------- | ------------------------------------------------------------------------------------ |
| `schema.ts`   | **Data layer.** A JSON Schema for the node's `properties` — types, validation rules. |
| `uischema.ts` | **Visual layer.** A JsonForms-shaped tree describing the form in the property panel. |

The two reference each other through `scope` strings — JsonPointer-style paths from the data schema's root, e.g. `'#/properties/url'`. `schema.ts` says **what** a property is; `uischema.ts` says **how** it renders.

## Pages in this section

| Page                                          | What it covers                                                                          |
| --------------------------------------------- | --------------------------------------------------------------------------------------- |
| [Data schema](/node-schemas/data-schema/)     | Field types, validators, the SDK's `options` extension, `NodeDataProperties` inference. |
| [Form overview](/node-schemas/form-overview/) | The shape of `uischema.ts` and how its three element families fit together.             |
| [Form controls](/node-schemas/form-controls/) | Every built-in input control with required + optional props and an example.             |
| [Form layouts](/node-schemas/form-layouts/)   | Containers (`VerticalLayout`, `HorizontalLayout`, `Group`, `Accordion`) and labels.     |

## Where to start

If you're authoring your first custom node, follow the [Add a custom node](/guides/add-a-custom-node/) recipe — it walks through `schema.ts`, `uischema.ts`, defaults, and palette registration end-to-end. Reach for the pages above when you need the type catalogue or the props for a specific control.
