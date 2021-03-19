# 1more

(One more) R&D project to bring performant DOM rendering to acceptable developer experience using template literals.
Works completely in-browser, doesn't require compiler, weights 3.7 kB (+ 817 B - box.js).

## Hello world

```js
import { component, html, render } from "1more";

const App = component(() => () => {
  return html`<div>Hello world</div>`;
});

render(App(), document.getElementById("app"));
```

You can try it [on Codesandbox](https://codesandbox.io/s/1more-bfoni)

## API Reference

### Rendering

#### html

```js
import { html } from "1more";

const world = "World";

html`<div>${`Hello ${world}`}</div>`;
```

Returns TemplateNode, containing given props and compiled HTML template. It does not create real DOM node, it's primary use is for diffing and applying updates during rendering phase.

Note: `html` uses custom XML-like string compiler instead of native DOM parsing. Therefore it will have differences with real HTML. For example, mixing plain text and insertion points inside one parent may not work properly. Some issues may be fixed, but some may require going back to DOM parsing or significantly complicate parser.

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

Valid childrens are: strings, numbers, ComponentNode, array of ComponentNodes.

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

`invalidate` accepts component reference object and will schedule update of this component. It allows to react on changes locally, without re-rendering the whole app.

On invalidate, component render function will be called and results will be diffed and applied accordingly.

Note: `invalidate` does not trigger update immediately. Instead update delayed till the end of current call stack. It allows to schedule multiple updates for different components and ensure that components are re-rendered only once and no unnecessary DOM modifications applied. If updates scheduled for multiple components, they going to be applied in order of depth, i.e. parent going to be re-rendered before its children.

#### useUnmount

```js
import { component, html, useUnmount } from "1more";

const SomeComponent = component(c => {
  useUnmount(c, () => {
    console.log("Component unmounted");
  });

  return () => {
    return html`<div>Some</div>`;
  };
});
```

Allows to attach callback, that going to be called before component unmounted.

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

Complementary primitive observable implementation, used mainly to support library in benchmarks. Tries to have low memory footprint, uses linked-lists to effectively manage subscriptions. Can be used as a cheap state management or as reference for integrating other libraries and writing hooks.

#### useSubscription

```js
import { component, html } from "1more";
import { box, useSubscription } from "1more/box";

const items = box([]);

const SomeComponent = component(c => {
  const getItemsCount = useSubscription(
    // Component reference
    c,
    // Source
    items,
    // Optional selector
    (items, prop) => items.count,
  );

  return prop => {
    return html`<div>${getItemsCount(prop)}</div>`;
  };
});
```

Setup subscription to source observable and returns getter function to read current value. When observable emits new value, it triggers update of the component.

#### usePropSubscription

```js
import { component, html, render } from "1more";
import { box, read, usePropSubscription } from "1more/box";

const item = {
  value: box(""),
};

const Item = component(c => {
  const getValue = usePropSubscription(c);

  return item => {
    return html`<div>${getValue(item.label)}</div>`;
  };
});

render(Item(item), document.body);
```

Allows to consume observable from component props. When receiving observable, it sets up subscription to it.

### Synthetic events

Rendered DOM nodes don't have attached event listeners. Instead renderer creates and attaches global event handlers per each event type, then use rendered app instance to discover target event handler.

Current implementation is very limited, it doesn't support bubble and capture phases of native events, and used only to find first matched target event handler.

### Does this implementation use Virtual DOM?

It is similar to vdom. On each render app generates immutable virtual tree structure that is used to diff against previous tree to calculate changed parts. Comparing to vdom, template nodes handled as one single entity with insertion points. This allows to compact tree structure in memory, separate static parts from dynamic, and as a result speed up diffing phase.

## Examples

- [JS Frameworks Benchmark](https://github.com/Freak613/1more/tree/master/examples/js-framework-benchmark)
- [Todo MVC](https://github.com/Freak613/1more/tree/master/examples/todomvc)
- [Todo MVC - Optimized](https://github.com/Freak613/1more/tree/master/examples/todomvc-optimized)
