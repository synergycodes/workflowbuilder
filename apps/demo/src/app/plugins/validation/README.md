# Validation

This plugin is responsible for detecting diagram-based errors. For example, it handles rules about edges or cases where a value computed in a previous node is referenced and then the connection to that node is removed.

It uses `@jsonforms` validation, so these errors behave like errors from empty required fields and similar cases.
