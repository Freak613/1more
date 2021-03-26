import { html, render, component, _resetTemplateCounter, key } from "./index";

describe("compiler", () => {
  beforeEach(() => {
    _resetTemplateCounter();

    document.body.innerHTML = "<div id='app'></div>";
  });

  const testTemplate = template => {
    expect(template.p).toMatchSnapshot();

    const container = document.getElementById("app");
    const App = component(() => () => template);
    render(App(), container);

    expect(container).toMatchSnapshot();
  };

  describe("basic", () => {
    it("basic 1", () => {
      testTemplate(html`<div></div>`);
    });

    it("basic 2", () => {
      testTemplate(html`
        <tr class=${"danger"}>
          <td class="col-md-1">${1}</td>
          <td class="col-md-4">
            <a onclick=${() => {}}> ${"test"} </a>
          </td>
          <td class="col-md-1">
            <a onclick=${() => {}}>
              <span
                class="glyphicon glyphicon-remove"
                aria-hidden="true"
              ></span>
            </a>
          </td>
          <td class="col-md-6"></td>
        </tr>
      `);
    });

    it("basic 3", () => {
      testTemplate(html`
        <div>
          <span>Space should be preserved when on single line </span>
          <div></div>
        </div>
      `);
    });

    it("basic 4", () => {
      testTemplate(
        // prettier-ignore
        html`
          <div>
            <span>
              Spacing should be removed when on separate line
            </span>
            <div></div>
          </div>
        `,
      );
    });

    it("basic 5", () => {
      testTemplate(
        html`
          <button id="test1" class=${"value2"} disabled>
            class=value2 disabled
          </button>
        `,
      );
    });

    it("basic 6", () => {
      testTemplate(
        html`
          <button id="test1" disabled class=${"value2"}>
            class=value2 disabled
          </button>
        `,
      );
    });

    it("basic 7", () => {
      testTemplate(html`<input id="test1" class=${"value2"} disabled />`);
    });
  });

  describe("afterNode", () => {
    it("afterNode 1", () => {
      testTemplate(html`
        <div>
          ${1}
          <div></div>
        </div>
      `);
    });

    it("afterNode 2", () => {
      testTemplate(
        html`
          <div>
            ${1} ${2}
            <div></div>
          </div>
        `,
      );
    });
  });

  describe("fragments", () => {
    it("fragments 1", () => {
      testTemplate(
        html`
          <div></div>
          <div></div>
        `,
      );
    });

    it("fragments 2", () => {
      testTemplate(
        html`
          <div>${1}</div>
          <div>${2}</div>
        `,
      );
    });
  });

  describe("mixed content", () => {
    it("mixed 1", () => {
      testTemplate(html`<div>Hello ${"World"}</div>`);
    });

    it("mixed 2", () => {
      testTemplate(
        html`
          <div>
            Zero ${"First"}
            <input />
            ${"Fourth"} Fifth ${"Sixth"}
          </div>
        `,
      );
    });

    it("mixed 3", () => {
      testTemplate(
        html`
          <div>
            <div>Zero ${"First"} Second ${"Third"} Fourth</div>
            <div>${"First"} Second ${"Third"} Fourth</div>
            <div>Zero ${"First"} Second ${"Third"} Fourth ${"Fifth"}</div>
            <div>${"First"} Second ${"Third"} Fourth ${"Fifth"}</div>
          </div>
        `,
      );
    });

    it("mixed 4", () => {
      testTemplate(
        html`
          <div></div>
          <div>
            <div></div>
            <div>Zero ${"First"} Second ${"Third"} Fourth ${"Fifth"}</div>
          </div>
        `,
      );
    });

    it("mixed 5", () => {
      testTemplate(
        html`
          <div>
            Zero ${"First"}
            <div>Second ${"Third"}</div>
            ${"Fourth"} Fifth ${"Sixth"}
          </div>
        `,
      );
    });

    it("mixed 6", () => {
      testTemplate(
        html`<div>Zero ${"First"} Second ${"Third"} Fourth ${"Fifth"}</div>`,
      );
    });

    it("mixed 7", () => {
      testTemplate(
        html`<div>${"First"} Second ${"Third"} Fourth ${"Fifth"}</div>`,
      );
    });

    it("mixed 8", () => {
      testTemplate(
        html`
          <div>
            <div></div>
            <div>
              <div></div>
              <div>Zero ${"First"} Second ${"Third"} Fourth ${"Fifth"}</div>
            </div>
          </div>
        `,
      );
    });

    it("mixed 9", () => {
      testTemplate(
        html`
          <div>
            <input class=${1} />
            Zero
            <div>First</div>
            Second
            <div>Third</div>
            Fourth
            <input class=${1} />
            Fifth ${"Sixth"} <input /> Seventh ${"Eighth"}
          </div>
        `,
      );
    });

    it("mixed 10", () => {
      testTemplate(
        html`
          <div>
            <input class=${1} />
            Zero
            <div>First</div>
            Second
            <div>Third</div>
            Fourth
            <input class=${1} />
            Fifth ${"Sixth"} <input /> Seventh ${"Eighth"}
          </div>
          <div>
            <input class=${1} />
            Zero
            <div>First</div>
            Second
            <div>Third</div>
            Fourth
            <input class=${1} />
            Fifth ${"Sixth"} <input /> Seventh ${"Eighth"}
          </div>
        `,
      );
    });

    it("mixed 11", () => {
      testTemplate(
        html`
          <div>
            Zero <input /> ${"First"} ${"Fourth"} <input /> Fifth ${"Sixth"}
          </div>
        `,
      );
    });

    it("mixed 12", () => {
      testTemplate(
        html`
          <div>
            Zero <input /> One <input /> ${"First"} ${"Fourth"} <input /> Fifth
            ${"Sixth"}
          </div>
        `,
      );
    });

    it("mixed 13", () => {
      testTemplate(
        html`
          <div>
            Zero <input /> Something else
            <div>Text</div>
            <input /> Fifth ${"Sixth"}
          </div>
        `,
      );
    });

    it("mixed 14", () => {
      testTemplate(
        html`
          <div onclick=${() => {}}>First row: ${1}</div>
          <div onclick=${() => {}}>Second row: ${2}</div>
        `,
      );
    });

    it("mixed 15", () => {
      testTemplate(
        html`
          <div onclick=${() => {}}>First row: ${1} by me</div>
          <div onclick=${() => {}}>Second row: ${2} by me</div>
        `,
      );
    });

    it("mixed 16", () => {
      testTemplate(
        html`
          <div>
            <!--
              Lorem ipsum dolor sit amet, consectetur adipiscing elit, 
              sed do eiusmod tempor incididunt ut labore et dolore magna 
              aliqua. Ut enim ad minim veniam, quis nostrud exercitation 
              ullamco laboris nisi ut aliquip ex ea commodo consequat. 
            -->

            <!-- Render a string or number directly -->
            <div>The message is: ${"message"}, count is: ${1}</div>

            <!-- Some other comment -->
            <div>The reversed message is: ${"message"}</div>
          </div>
        `,
      );
    });
  });
});

describe("reconcile", () => {
  beforeEach(() => {
    _resetTemplateCounter();

    document.body.innerHTML = "<div id='app'></div>";
  });

  const testReconcile = (first, second) => {
    const container = document.getElementById("app");

    const Item = component(() => item => html`<span>${item}</span>`);

    const App = component(() => state => html`
      <div>${state.map(item => key(item, Item(item)))}</div>
    `);

    render(App(first), container);
    expect(container).toMatchSnapshot();

    render(App(second), container);
    expect(container).toMatchSnapshot();
  };

  it("reconcile 1", () => {
    testReconcile([1, 2], [3, 4, 1, 2]);
  });

  it("reconcile 2", () => {
    testReconcile([1, 2], [1, 3, 4, 2]);
  });

  it("reconcile 3", () => {
    testReconcile([1, 2, 3, 4, 5, 6], [1, 5, 3, 4, 2, 6]);
  });

  it("reconcile 4", () => {
    testReconcile([1, 2, 3, 4, 5], [1, 4, 3, 2, 5]);
  });

  it("reconcile 5", () => {
    testReconcile([1, 2, 3, 4, 5], [5, 4, 3, 2, 1]);
  });

  it("reconcile 6", () => {
    testReconcile([1, 2, 3, 4, 5, 6], [6, 5, 4, 3, 2, 1]);
  });

  it("reconcile 7", () => {
    testReconcile([1, 2, 3, 4, 5, 6], [2, 3, 4, 5, 6, 1]);
  });

  it("reconcile 8", () => {
    testReconcile([1, 2, 3, 4, 5, 6], [3, 4, 5, 6, 1, 2]);
  });

  it("reconcile 9", () => {
    testReconcile([1, 2, 3, 4, 5, 6], [6, 1, 2, 3, 4, 5]);
  });

  it("reconcile 10", () => {
    testReconcile([1, 2, 3, 4, 5, 6], [3, 4, 5, 6, 2]);
  });

  it("reconcile 11", () => {
    testReconcile([1, 2, 3, 4, 5, 6], [2, 3, 4, 5, 6, 7, 1]);
  });

  it("reconcile 12", () => {
    testReconcile([1, 2, 3, 4, 5, 6, 7], [1, 5, 6, 4, 2, 3, 7]);
  });
});
