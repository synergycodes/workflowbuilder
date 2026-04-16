# Using Workflow Builder as a component in React App

📦 - source repository (this one)  
🚩 - target repository

## Workflow Builder copy

1. Create `src/features/workflow-builder` 🚩 inside your project
2. Copy the content of `apps/frontend/src/app` 📦 as `src/features/workflow-builder` 🚩 (skip `node_modules` and `dist` catalogs)
3. Change name of component `App` to `WorkflowBuilder` in `features/workflow-builder/app.tsx` 🚩
4. Import `<WorkflowBuilder />` to correct place in the application (to be able to see problems: For example, you might migrate from `apps/frontend/src/global.css` 📦 to `src/features/workflow-builder/global.css` 🚩)

## Fixing icons and types

1. Copy `app/types` 📦 and `app/icons` 📦 to `features/workflow-builder/*` 🚩 (skip `node_modules` and `dist` catalogs)
2. Change all phrases `from '@workflow-builder'` 📦 to `from '@/features/workflow-builder` 🚩
3. Copy all "dependencies" and "devDependencies" from `app/icons` 📦 to root `package.json` 🚩
4. Remove `package.json` 🚩 and `apps/icons/tsconfig.json` 🚩 from `features/workflow-builder/icons` 🚩 and `features/workflow-builder/icons` 🚩 (it will work from root `package.json` 🚩 now)
5. In `src/features/workflow-builder/icons/config.json` 🚩 change `./assets` to `./src/features/workflow-builder/assets`
6. In `src/features/workflow-builder/icons/config.json` 🚩 change `./dist` to `./src/features/workflow-builder/dist`
7. In `package.json` 🚩 add `"prepare": "tsx src/features/workflow-builder/icons/src/generate-icons.ts",`
8. Run `npm run prepare` to test it (it should generate a dist catalog in `src/features/workflow-builder/icons/dist` 🚩)
9. If there is a pipeline for build add `npm run prepare` after `ci` / `install`
10. Add `npm run prepare` to read me `npm run dev` requires this process to run only once so we don't have to prepare it more times

## Props as data

1. `features/integration/components/with-integration.tsx` 🚩 change to `hocByStrategy.PROPS;`

Read more integration strategies here: `apps/frontend/src/app/features/integration/README.md`
