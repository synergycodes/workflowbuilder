# How to set up a new Synergy Codes project based on the Workflow Builder editor

## Add the repository to Bitbucket

Follow the steps from this instruction:
https://synergiapro.atlassian.net/wiki/spaces/ENG/pages/3516760077/Dodawanie+projektu+-+repozytorium+infrastructure

If your implementation doesn't require a database, you can delete the related files (check closed PRs to see how others are handling it).

## Clone the new repository

### Branch
Create a new branch `master`, which will be set as the main branch, and set up a development branch, similar to the WorkflowBuilder repository. Don't push it yet.

### Folder
Open WorkflowBuilder, fetch the latest master branch, and copy the contents of the WorkflowBuilder directory to the new repository.

### Check
Run `pnpm install` and `pnpm dev` to check whether everything works.

### Plugins
Find the `plugins` directory, remove all plugins, restart the project, and check what failed (probably two imports need to be removed, do that).

Check repository again.

### Update pipeline processes

Find all `generic-workflow-editor` in the `tools` directory and replace them with the name of your repository.

### Setup deployment

`TODO:` This section should be updated after the deployment issues are resolved.

### Commit and push branch

Name your commit clearly (the message will remain visible for many files that may never change), and push it. :)

### Ask for permissions for other developers

Ask the people responsible for infrastructure to grant access to other developers on your project.

---

# Styles

If the design team gave you access to figma with tokens, override the default ones from Axiom.

Use `variables2css` plugin, after generating tokens you should be able to remove `@import '@synergycodes/axiom/tokens.css';` and add your `./tokens.css`.

You can check `[theme="Light"]` and convert `Light` -> `light` and `Dark` to `dark` if needed.
