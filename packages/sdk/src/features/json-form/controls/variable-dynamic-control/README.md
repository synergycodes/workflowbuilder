# Variable Dynamic Control

This control accepts an expected type and displays the appropriate input control for that type. It also provides an additional `{}` button that lets users select variables whose type matches the expected type.

## Backend

### Expectations

This control is designed to always return either the correct type or a single variable reference matching that type (a string). For example, a boolean value can be either boolean `true` or string `{{nodes.<nodeId>.wasChecked}}`, which is dynamic and can be `true` or `false`.
