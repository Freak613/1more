# 1more

(One more) R&D project to bring performant DOM rendering to acceptable developer experience using template literals.

## Hello world

```js
import { component, html, render } from "1more";

const App = component(() => () => {
  return html`<div>Hello world</div>`;
});

render(App(), document.getElementById("app"));
```

## API Reference

### Rendering

#### html

```js
import { html } from "1more";

const world = "World";

html`<div>${`Hello ${world}`}</div>`;
```

Returns TemplateNode, containing given props and compiled HTML template. It does not create real DOM node, it's primary use is for diffing and applying updates during rendering phase.

Note: `html` uses XML-like string compiler instead of native DOM parsing. Primarily to speed up template compilation. Therefore it will have differences with real HTML. For example, mixing plain text and insertion points inside one parent may not work properly. Some issues may be fixed, but some may require going back to DOM parsing or significantly complicate parser.

##### Attributes

It's possible to control element attributes and assign event handlers:

```js
import { html } from "1more";

const on = true;

html`
  <div
    class=${on ? "turned-on" : null}
    onclick=${() => console.log("Clicked")}
  ></div>
`;
```

Partial attributes are not supported. Most attributes are assigned directly to DOM node. Event handlers are stored as part of rendered instance and are called via synthetic events subsystem.

##### Children

Valid childrens are: strings, numbers, ComponentNode, array of keyed ComponentNodes.

```js
import { html, key } from "1more";

// prettier-ignore
html`
  <div>
    ${1}
    ${"Lorem ipsum"}
    ${SomeComponent(value)} 
    ${items.map(i => key(i.id, Item(i)))}
  </div>
`;
```

#### component

```js
import { component, html, render } from "1more";

const App = component(c => {
  return ({ text }) => {
    return html`<div>${text}</div>`;
  };
});

render(App({ text: "Hello" }), document.body);
```

Creates component that returns ComponentNode when called.

Its only argument is rendering callback, that accepts component reference object and returns rendering function. Rendering function accepts provided props and returns TemplateNode.

When calling created component function, rendering callback is not invoked immediately. Instead, it's invoked during rendering phase. Outer function going to be executed only once during first render, after that only returned render function will be invoked.

Note: Trying to render component with props object, that referentially equal to the one that was used in previous render, will result in no-op.

#### render

```js
import { render } from "1more";

render(App(), document.getElementById("app"));
```

When called first time, `render` going to mount HTML document created from component to provided container. After that, on each `render` call, it will perform diffing new component structure with previous one and apply updates as necessary. This behavior is similar to React and other virtual dom libraries.

Note: `render` accepts only ComponentNodes.

#### key

```js
import { html, key } from "1more";

// prettier-ignore
html`
  <div>
    ${items.map(item => key(item.id, Item(item)))}
  </div>
`;
```

Assign given key to ComponentNode. This key is used in nodes reconciliation algorithm, to differentiate nodes from each other and perform proper updates.

Note: only arrays of keyed components are supported. Trying to render array of non-keyed items will not work properly.

#### invalidate

```js
import { component, html, invalidate } from "1more";

const SomeComponent = component(c => {
  let localState = 1;

  return () => {
    return html`
      <button
        onclick=${() => {
          localState++;
          invalidate(c);
        }}
      >
        ${localState}
      </button>
    `;
  };
});
```

`invalidate` accepts component reference object and will trigger update of this component. It allows to react on changes locally, without re-rendering the whole app.

On invalidate, component render function will be called and results will be diffed and applied accordingly.

### Observables

#### box

```js
import { box, read, write, subscribe } from "1more/box";

const state = box(1);

read(state); // Returns 1

const unsub = subscribe(value => {
  console.log("Current value: ", value);
}, state);

write(2, state); // Logs "Current value: 2"
```

Primitive observable implementation.

#### createSelector

```js
import { component, html } from "1more";
import { box, createSelector } from "1more/box";

const items = box([]);

let compRef;
const getItemsCount = createSelector(
  // Source observable
  items,
  // Get reference for invalidation
  () => compRef,
  // Optional selector
  items => items.count,
);

const SomeComponent = component(c => {
  compRef = c;

  return () => {
    return html`<div>${getItemsCount()}</div>`;
  };
});
```

Setup subscription to target observable and returns getter function to read current value. When observable emits new value, it triggers validation of given component.

It's important to call selector in component render function, to keep its internal state updated when component was rerendered by parent or by other selector.

#### keyedSelector

```js
import { component, html } from "1more";
import { box, read, keyedSelector } from "1more/box";
import { memo } from "1more/utils";

const selected = box(undefined);
const items = box([]);

const itemsRefs = new WeakMap();

const isSelected = keyedSelector(
  // Source observable that trigger recomputation
  selected,
  // Get cache keys
  () => read(items),
  // Item selector
  (item, selected) => item.id === selected,
  // WeakMap to lookup for component reference
  itemsRefs,
);

const Item = component(c => {
  const setup = memo(item => {
    itemsRefs.set(item, c);
  });

  return item => {
    setup(item);

    return html`
      <div class=${isSelected(item) ? "selected" : null}>${item.label}</div>
    `;
  };
});
```

Setup shared selector for multiple components. When source observable emits value, it runs selector computation for each key item and store results internally using WeakMap for diffing and triggering updates only for changed items. For that reason, `getKeys` parameter needed to iterate over weak cache and get cached values for comparison. Changed key then used to lookup for component reference in given map and trigger its update. Returned selector uses key item to get cached value.

Using WeakMap for this task gives automatic garbage collection of cache values when source key object has no other references. And because of using WeakMap, only mutable objects can be used as keys.

#### unchanged

```js
import { box, write, unchanged } from "1more/box";

const source = box(1);

subscribe(value => {
  console.log("Value is not changed", value);
}, unchanged(source));

write(2, source); // No effect
write(2, source); // Logs: "Value is not changed 2"
```

Utility observable that takes source observable and returns new one, that emits values when 2 or more values from source are referentially equal (using `===`).

`unchanged` can be used to solve problem of separation array items updates from structural updates (adding/removal):

```js
import { box, read, write, subscribe, unchanged } from "1more/box";

const items = box([]);

let nextId = 1;
const actions = {
  addItem: () => {
    const values = read(items);
    // Creates new array instance
    const nextValues = values.concat({ id: nextId++, value: "" });
    write(nextValues, items);
  },
  updateItem: (id, newValue) => {
    const values = read(items);
    values.forEach(item => {
      if (item.id === id) {
        item.value = newValue;
      }
      return item;
    });
    write(values, items);
  },
};

subscribe(values => {
  console.log("Item in array changed");
}, unchanged(items));

actions.addItem(); // No effect

actions.updateItem(1, "newValue"); // Logs "Item in array changed",
```

### Utils

#### memo

```js
import { memo } from "1more/utils";

const getItemsCount = memo(items => items.length);

const items = [];

getItemsCount(items);

getItemsCount(items); // Used previous value
```

Setup memoized function with cache size = 1. Compares input value with previous one, and re-runs provided function.

### Synthetic events

Rendered DOM nodes don't have attached event listeners. Instead renderer creates and attaches global event handlers per each event type, then use rendered app instance to discover target event handler.

Current implementation is very limited, it doesn't support bubble and capture phases of native events, and used only to find first matched target event handler.

### Does this implementation use Virtual DOM?

It is similar to vdom. On each render app generates immutable virtual tree structure that is used to diff against previous tree to calculate changed parts. Comparing to vdom, template nodes handled as one single entity with insertion points. This allows to compact tree structure, separate static parts from dynamic, thus reducing amount of used memory and speed up diffing phase.

## Examples

- [JS Frameworks Benchmark](https://github.com/Freak613/1more/tree/master/examples/js-framework-benchmark)
- [Todo MVC](https://github.com/Freak613/1more/tree/master/examples/todomvc)
- [Todo MVC - Optimized](https://github.com/Freak613/1more/tree/master/examples/todomvc-optimized)
