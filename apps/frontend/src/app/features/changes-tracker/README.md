# Changes tracker for Workflow Builder

The changes tracker is a small callback added whenever something meaningful is changed in the graph.

It may be omitted in some places, but its main goal is to give you an easy place to react to changes.

## What changes tracker is perfect for?

  - Adding social trackers such as GTM, Facebook Pixel etc.
  - Adding auto-save feature
  - Adding undo/redo functionality to the app

## Why do we use `trackFutureChange()` and not `trackChange()`

Feel free to create `trackChange()` if you need one (but be aware that sometimes you can’t react immediately after something changes inside ReactFlow.).

In our case, we use `trackFutureChange()` because it allows us to react before something happens. For example, building history requires taking a snapshot before an action occurs - with `trackFutureChange()`, we can create the snapshot before removing something, and technically, we can add `setTimeout(() => { /* do something after */}, 1)` in our callback - that logic will be executed in the next JavaScript event loop cycle, giving us access to the state afterward (in the most of cases).

## Example

Somewhere in the app:
```js
trackFutureChange('duplicate');
duplicate(nodes);
```

### How to inject callback before the event?

With a plugin (check plugins documentation):
```js
registerFunctionDecorator('trackFutureChange', {
  callback: ({ params }) => console.log(params[1]), // "duplicate"
});
```

### How to react after the event?

In a React hook:
```js
const lastChangeTimestamp = useChangesTrackerStore(store => store.lastChangeTimestamp);

useEffect(() => {
  const timeSinceLastSaveInSeconds = (lastChangeTimestamp - lastSaveTimestamp) / 1000;

  if (timeSinceLastSaveInSeconds > 5 * 60) {
    save();
  } 
}, [lastChangeTimestamp])
```

With zustand store subscriber:
```js
useChangesTrackerStore.subscribe((state) => state.lastChangeTimestamp, saveIfNeededCallback);
```

You need to add `subscribeWithSelector` for it to work, check: https://zustand.docs.pmnd.rs/middlewares/subscribe-with-selector