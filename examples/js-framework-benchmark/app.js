import { html, render, key, component } from "1more";
import {
  box,
  read,
  write,
  keyedSelector,
  createSelector,
  unchanged,
} from "1more/box";
import { memo } from "1more/utils";

function random(max) {
  return Math.round(Math.random() * 1000) % max;
}

const A = [
  "pretty",
  "large",
  "big",
  "small",
  "tall",
  "short",
  "long",
  "handsome",
  "plain",
  "quaint",
  "clean",
  "elegant",
  "easy",
  "angry",
  "crazy",
  "helpful",
  "mushy",
  "odd",
  "unsightly",
  "adorable",
  "important",
  "inexpensive",
  "cheap",
  "expensive",
  "fancy",
];
const C = [
  "red",
  "yellow",
  "blue",
  "green",
  "pink",
  "brown",
  "purple",
  "brown",
  "white",
  "black",
  "orange",
];
const N = [
  "table",
  "chair",
  "house",
  "bbq",
  "desk",
  "car",
  "pony",
  "cookie",
  "sandwich",
  "burger",
  "pizza",
  "mouse",
  "keyboard",
];

let nextId = 1;

function buildData(count) {
  const data = [];
  for (let i = 0; i < count; i++) {
    data[i] = {
      id: nextId++,
      label: `${A[random(A.length)]} ${C[random(C.length)]} ${
        N[random(N.length)]
      }`,
    };
  }
  return data;
}

const state = {
  data: box([]),
  selected: box(undefined),
};

const actions = {
  run() {
    write(buildData(1000), state.data);
  },
  add() {
    const data = read(state.data);
    write(data.concat(buildData(1000)), state.data);
  },
  runlots() {
    write(buildData(10000), state.data);
  },
  cleardata() {
    write([], state.data);
    write(undefined, state.selected);
  },
  update() {
    const data = read(state.data);
    for (let i = 0; i < data.length; i += 10) {
      const item = data[i];
      item.label = item.label + " !!!";
    }
    write(data, state.data);
  },
  select(id) {
    write(id, state.selected);
  },
  remove(id) {
    const data = read(state.data).slice();
    const idx = data.findIndex(item => item.id === id);
    data.splice(idx, 1);
    write(data, state.data);
  },
  swaprows() {
    const data = read(state.data).slice();
    const tmp = data[1];
    data[1] = data[998];
    data[998] = tmp;
    write(data, state.data);
  },
};

const itemsRefs = new WeakMap();

const isSelected = keyedSelector(
  state.selected,
  () => read(state.data),
  (item, selected) => item.id === selected,
  itemsRefs,
);

const getLabel = keyedSelector(
  unchanged(state.data),
  () => read(state.data),
  item => item.label,
  itemsRefs,
);

const Item = component(c => {
  const setup = memo(item => {
    itemsRefs.set(item, c);
  });

  return item => {
    setup(item);

    return html`
      <tr class=${isSelected(item) ? "danger" : null}>
        <td class="col-md-1">${item.id}</td>
        <td class="col-md-4">
          <a onclick=${() => actions.select(item.id)}>${getLabel(item)}</a>
        </td>
        <td class="col-md-1">
          <a onclick=${() => actions.remove(item.id)}>
            <span class="glyphicon glyphicon-remove" aria-hidden="true"></span>
          </a>
        </td>
        <td class="col-md-6"></td>
      </tr>
    `;
  };
});

let appRef;
const getData = createSelector(state.data, () => appRef);

const App = component(c => {
  appRef = c;

  return () => html`
    <div class="container">
      <div class="jumbotron">
        <div class="row">
          <div class="col-md-6">
            <h1>1more</h1>
          </div>
          <div class="col-md-6">
            <div class="row">
              <div class="col-sm-6 smallpad">
                <button
                  type="button"
                  class="btn btn-primary btn-block"
                  id="run"
                  onclick=${actions.run}
                >
                  Create 1,000 rows
                </button>
              </div>
              <div class="col-sm-6 smallpad">
                <button
                  type="button"
                  class="btn btn-primary btn-block"
                  id="runlots"
                  onclick=${actions.runlots}
                >
                  Create 10,000 rows
                </button>
              </div>
              <div class="col-sm-6 smallpad">
                <button
                  type="button"
                  class="btn btn-primary btn-block"
                  id="add"
                  onclick=${actions.add}
                >
                  Append 1,000 rows
                </button>
              </div>
              <div class="col-sm-6 smallpad">
                <button
                  type="button"
                  class="btn btn-primary btn-block"
                  id="update"
                  onclick=${actions.update}
                >
                  Update every 10th row
                </button>
              </div>
              <div class="col-sm-6 smallpad">
                <button
                  type="button"
                  class="btn btn-primary btn-block"
                  id="clear"
                  onclick=${actions.cleardata}
                >
                  Clear
                </button>
              </div>
              <div class="col-sm-6 smallpad">
                <button
                  type="button"
                  class="btn btn-primary btn-block"
                  id="swaprows"
                  onclick=${actions.swaprows}
                >
                  Swap Rows
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <table class="table table-hover table-striped test-data">
        <tbody>
          ${getData().map(item => key(item.id, Item(item)))}
        </tbody>
      </table>
      <span
        class="preloadicon glyphicon glyphicon-remove"
        aria-hidden="true"
      ></span>
    </div>
  `;
});

const container = document.getElementById("main");

render(App(), container);
