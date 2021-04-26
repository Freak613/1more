# 1more

[![Size](https://badgen.net/bundlephobia/minzip/1more)](https://unpkg.com/1more/dist/index.min.js)

(One more) R&D project to bring performant DOM rendering to acceptable developer experience using template literals.
Works completely in-browser, doesn't require compiler.

## Hello world

```js
import { html, render } from "1more";

const Hello = name => html`<div>Hello ${name}</div>`;

render(Hello("World"), document.getElementById("app"));
```

You can try it [on Codesandbox](https://codesandbox.io/s/1more-bfoni)

## API Reference

### Rendering

#### html

```js
import { html, render } from "1more";

const world = "World";

const element = html`<div>Hello ${world}</div>`;

render(element, document.body);
```

Returns TemplateNode, containing given props and compiled HTML template. It does not create real DOM node, it's primary use is for diffing and applying updates during rendering phase. Fragments are supported (template with multiple root nodes).

##### Properties and Attributes

It's possible to control element properties and attributes, and use event handlers with nodes:

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

- Static attributes (that does not have dynamic bindings):
  - Should be in the same form as in plain HTML code. Library does not perform processing or normalization of static content. For example `tabindex` instead of `tabIndex` or string representation of `style` attribute.
- Dynamic attributes (that have dynamic bindings):
  - Should not have quotes around them;
  - Only one binding per attribute can be used, partial attributes are not supported;
  - Supports both property and HTML attribute names. For example: `tabIndex` / `tabindex`.
  - No name conversion performed. Names are going to be used exactly as specified in the template.
  - If property and its corresponding HTML attribute has same name, values will be assigned to property. For example for `id` attribute will be used node `id` property. So it's property-first approach, with fallback to attributes when property not found in node instance.
  - Assigning `null` or `undefined` to any property or attribute will result in removal of this attribute. For properties on native elements, library converts property name into corresponding attribute name to perform removal.
  - There is no behavior around `disabled` or similar boolean attributes to force remove them on getting `false` value. Sometimes using direct property has same effect, for example assigning `node.disabled = false` will remove the attribute. CSS selectors seemed to use node's actual property values over HTML definition. For all other cases it's better to use `null` or `undefined` to perform removal.
- Special dynamic attributes:
  - `class` / `className` - accepts only strings. Assigning `null`, `undefined` or any non-string value will result in removal of this attribute.
  - `style` - accepts objects with dashed CSS properties names. For example `background-color` instead of `backgroundColor`. Browser prefixes and custom CSS properties are supported. Assigning `null` or `undefined` to `style` will remove this attribute. Assigning `null`, `undefined` or empty string to CSS property value will remove it from element's style declaration.
  - `defaultValue` / `defaultChecked` - can be used to assign corresponding value to node on first mount, and skipping it on updates. Thus it's possible to create uncontrolled form elements.
  - `innerHTML` is temporarily disabled.
- Event handlers should have name starting with `on` and actual event name. For example `onclick` instead of `onClick`. Handlers are not attached to DOM nodes, instead library use automatic event delegation.
- For Custom Elements:
  - Element should be registered before call to `html` with template containing this element.
  - Property-first approach should work fine, as long as property is exposed in element instance. When assigning `null` or `undefined` to element property, it is going to be directly assigned to element, not triggering removal. For attributes `null` and `undefined` will work as usual, removing attribute from element.
  - Delegated events will work fine from both inside and outside of Shadow DOM content (even in closed mode) and doesn't require for events to be `composed`. Only current limitation is that for slotted content event order will not be correct.
  - It's possible to render to `shadowRoot` directly, without any container element.

##### Children

Valid childrens are: string, number, null, undefined, boolean, TemplateNode, ComponentNode and arrays of any of these types (including nested arrays).

Note: null, undefined, true, false values render nothing, just like in React.

```js
import { html, component } from "1more";

const SomeComponent = component(() => {
  return value => {
    return html`<div>${value}</div>`;
  };
});

// prettier-ignore
html`
  <div>
    ${1}
    ${"Lorem ipsum"}
    ${null}
    ${false && html`<div></div>`}
    ${SomeComponent("Content")} 
    ${items.map(i => html`<div>${item.label}</div>`)}
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

Creates component factory, that returns ComponentNode when called. Components are needed to use hooks, local state and shouldComponentUpdate optimizations.

Its only argument is rendering callback, that accepts component reference object and returns rendering function. Rendering function accepts provided props and returns any valid children type, including switching return types based on different conditions.

When calling created component function, rendering callback is not invoked immediately. Instead, it's invoked during rendering phase. Outer function going to be executed only once during first render, after that only returned render function will be invoked.

Note: Trying to render component with props object, that referentially equal to the one that was used in previous render, will result in no update. This is shouldComponentUpdate optimization.

#### render

```js
import { render } from "1more";

render(App(), document.getElementById("app"));
```

When called first time, `render` going to mount HTML document created from component to provided container. After that, on each `render` call, it will perform diffing new component structure with previous one and apply updates as necessary. This behavior is similar to React and other virtual dom libraries. Render accepts any valid children types.

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

Creates KeyNode with given value inside. These keys are used in nodes reconciliation algorithm, to differentiate nodes from each other and perform proper updates. Valid keys are strings and numbers.

Note: It is possible to use keys with primitive or nullable types if needed. Arrays are not limited to only keyed nodes, it is possible to mix them if necessary. Nodes without keys are going to be updated (or replaced) in place.

```js
import { render, key, html } from "1more";

render(
  [
    null,
    undefined,
    key(0, true),
    false,
    key(1, html`<div>First node</div>`),
    html`<div>After</div>`,
  ],
  document.body,
);
```

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

### Delegated events

Rendered DOM nodes don't have attached event listeners. Instead renderer attaches delegated event handlers to rendering root (container argument in `render` function) for each event type, then will use rendered app instance to discover target event handler.

Events that have `bubbles: true` will be handled in `bubble` phase (from bottom to top), with proper handling of `stopPropagation` calls.

Events that have `bubbles: false` (like `focus` event) will be handled in their `capture` phase on the target. This should not affect normal usage, but worth keep in mind when debugging.

Note: All event handlers are active (with `passive: false`), and system doesn't have built-in support to handle events in `capture` phase.

### Does this implementation use Virtual DOM?

It is similar to vdom. On each render app generates immutable virtual tree structure that is used to diff against previous tree to calculate changed parts. Comparing to vdom, template nodes handled as one single entity with insertion points. This allows to compact tree structure in memory, separate static parts from dynamic, and as a result speed up diffing phase.

## Examples

- [JS Frameworks Benchmark](https://github.com/Freak613/1more/tree/master/examples/js-framework-benchmark)
- [Todo MVC](https://github.com/Freak613/1more/tree/master/examples/todomvc)
- [Todo MVC - Optimized](https://github.com/Freak613/1more/tree/master/examples/todomvc-optimized)

## Credits

- [ivi](https://github.com/localvoid/ivi) - inspired component and hooks API and a lot of hi-perf optimizations.
