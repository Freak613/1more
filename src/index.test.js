import {
  html,
  render,
  component,
  _resetTemplateCounter,
  key,
  useUnmount,
  invalidate,
} from "./index";

const wait = t => {
  return new Promise(resolve => {
    setTimeout(() => resolve(), t);
  });
};

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

    return container;
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

    it("basic 8", () => {
      const container = testTemplate(
        html`<input type=${"checkbox"} checked=${true} class=${"some"} />`,
      );

      const checkbox = container.firstChild;
      expect(checkbox.checked).toBe(true);
    });

    it("basic 9", () => {
      testTemplate(
        html`<input
          type=${"checkbox"}
          checked=${false}
          data-testid=${"fancy-checkbox"}
        />`,
      );
    });

    it("basic 10", () => {
      testTemplate(html`<div style=${{ color: "red" }}>Test</div>`);
    });

    it("basic 11", () => {
      const Child = component(() => () => html`<span>child</span>`);
      testTemplate(html`<div>${Child()}</div>`);
    });

    it("basic 12", () => {
      testTemplate(html`<div class=${""} />`);
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

    it("mixed 17", () => {
      testTemplate(
        html`
          <div>
            ${"Test"} After
            <button onclick=${() => {}}>Fire</button>
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

  it("reconcile 13", () => {
    testReconcile([1, 2, 3, 4, 5], [1, 2, 3]);
  });

  it("reconcile 14", () => {
    testReconcile([1, 2, 3, 4, 5], [6, 7, 8, 9, 10]);
  });

  it("reconcile 15", () => {
    const container = document.getElementById("app");

    const Item = component(() => item => html`<span>${item}</span>`);

    const App = component(() => state => html`
      <div>${state.map(item => key(item, Item(item)))} After</div>
    `);

    render(App([1, 2, 3, 4, 5]), container);
    expect(container).toMatchSnapshot();

    render(App([6, 7, 8, 9, 10]), container);
    expect(container).toMatchSnapshot();
  });

  it("reconcile 16", () => {
    testReconcile([1, 2, 3, 4, 5, 6, 8, 9, 10], [1, 9, 3, 6, 5, 4, 8, 2, 10]);
  });

  it("reconcile 17", () => {
    testReconcile([1, 2, 3, 4, 5, 6], [1, 2, 3, 6]);
  });

  it("reconcile 18", async () => {
    const container = document.getElementById("app");

    const Child1 = component(() => () => "Child1");

    const Child2 = component(() => () => "Child2");

    const Child3 = component(() => () => "Child3");

    const App = component(c => {
      let state = false;

      return () => {
        return html`
          <div>
            <button
              id="target"
              onclick=${() => {
                state = true;
                invalidate(c);
              }}
            >
              Fire
            </button>
            <div>
              ${[key(1, state ? Child2() : Child1()), key(2, Child3())]}
            </div>
          </div>
        `;
      };
    });
    render(App(), container);

    expect(container).toMatchSnapshot();

    const target = document.getElementById("target");
    target.dispatchEvent(new Event("click"));
    await wait(1);

    expect(container).toMatchSnapshot();
  });

  it("reconcile 19", async () => {
    const container = document.getElementById("app");

    const Child1 = component(() => () => "Child1");

    const Child2 = component(() => () => "Child2");

    const Child3 = component(() => () => []);

    const Child4 = component(() => () => "Child4");

    const App = component(c => {
      let state = false;

      return () => {
        return html`
          <div>
            <button
              id="target"
              onclick=${() => {
                state = true;
                invalidate(c);
              }}
            >
              Fire
            </button>
            <div>
              ${[
                key(1, state ? Child2() : Child1()),
                key(2, Child3()),
                key(3, Child4()),
              ]}
            </div>
          </div>
        `;
      };
    });
    render(App(), container);

    expect(container).toMatchSnapshot();

    const target = document.getElementById("target");
    target.dispatchEvent(new Event("click"));
    await wait(1);

    expect(container).toMatchSnapshot();
  });

  it("reconcile 20", async () => {
    const container = document.getElementById("app");

    const Child1 = component(() => () => "Child1");

    const Child2 = component(() => () => "Child2");

    const Child3 = component(() => () => []);

    const App = component(c => {
      let state = false;

      return () => {
        return html`
          <div>
            <button
              id="target"
              onclick=${() => {
                state = true;
                invalidate(c);
              }}
            >
              Fire
            </button>
            <div>
              ${[key(1, state ? Child2() : Child1()), key(2, Child3())]} After
            </div>
          </div>
        `;
      };
    });
    render(App(), container);

    expect(container).toMatchSnapshot();

    const target = document.getElementById("target");
    target.dispatchEvent(new Event("click"));
    await wait(1);

    expect(container).toMatchSnapshot();
  });

  it("reconcile 21", async () => {
    const container = document.getElementById("app");

    const Child = component(() => k => `Child${k}`);

    const Child1 = component(() => () => "Test-Child1");

    const Child2 = component(() => () => "Test-Child2");

    const Child3 = component(() => () => []);

    const App = component(c => {
      let state = false;

      return () => {
        return html`
          <div>
            <button
              id="target"
              onclick=${() => {
                state = true;
                invalidate(c);
              }}
            >
              Fire
            </button>
            <div>
              ${[
                state ? key(4, Child(4)) : key(1, Child(1)),
                key(2, state ? Child2() : Child1()),
                key(3, Child3()),
                state ? key(1, Child(1)) : key(4, Child(4)),
              ]}
              After
            </div>
          </div>
        `;
      };
    });
    render(App(), container);

    expect(container).toMatchSnapshot();

    const target = document.getElementById("target");
    target.dispatchEvent(new Event("click"));
    await wait(1);

    expect(container).toMatchSnapshot();
  });

  it("reconcile 22", async () => {
    const container = document.getElementById("app");

    const Child = component(() => k => `Child${k}`);

    const Child3 = component(() => () => []);

    const App = component(c => {
      let state = false;

      return () => {
        return html`
          <div>
            <button
              id="target"
              onclick=${() => {
                state = true;
                invalidate(c);
              }}
            >
              Fire
            </button>
            <div>
              ${[state ? key(4, Child(4)) : key(1, Child(1)), key(3, Child3())]}
              After
            </div>
          </div>
        `;
      };
    });
    render(App(), container);

    expect(container).toMatchSnapshot();

    const target = document.getElementById("target");
    target.dispatchEvent(new Event("click"));
    await wait(1);

    expect(container).toMatchSnapshot();
  });

  it("reconcile 23", async () => {
    const container = document.getElementById("app");

    const Child = component(() => k => `Child${k}`);

    const Child3 = component(() => () => []);

    const App = component(c => {
      let state = false;

      return () => {
        return html`
          <div>
            <button
              id="target"
              onclick=${() => {
                state = true;
                invalidate(c);
              }}
            >
              Fire
            </button>
            <div>
              ${[
                state ? key(4, Child(4)) : key(1, Child3()),
                key(2, Child(2)),
                state ? key(1, Child(1)) : key(4, Child(4)),
              ]}
              After
            </div>
          </div>
        `;
      };
    });
    render(App(), container);

    expect(container).toMatchSnapshot();

    const target = document.getElementById("target");
    target.dispatchEvent(new Event("click"));
    await wait(1);

    expect(container).toMatchSnapshot();
  });

  it("reconcile 24", async () => {
    const container = document.getElementById("app");

    const Child = component(() => k => `Child${k}`);

    const Child3 = component(() => () => []);

    const App = component(c => {
      let state = false;

      return () => {
        return html`
          <div>
            <button
              id="target"
              onclick=${() => {
                state = true;
                invalidate(c);
              }}
            >
              Fire
            </button>
            <div>
              ${[
                state ? key(4, Child(4)) : key(1, Child3()),
                key(2, Child3()),
                state ? key(1, Child(1)) : key(4, Child(4)),
              ]}
              After
            </div>
          </div>
        `;
      };
    });
    render(App(), container);

    expect(container).toMatchSnapshot();

    const target = document.getElementById("target");
    target.dispatchEvent(new Event("click"));
    await wait(1);

    expect(container).toMatchSnapshot();
  });

  it("reconcile 25", async () => {
    const container = document.getElementById("app");

    const Child = component(() => k => `Child${k}`);

    const Child3 = component(() => () => []);

    const App = component(c => {
      let state = false;

      return () => {
        return html`
          <div>
            <button
              id="target"
              onclick=${() => {
                state = true;
                invalidate(c);
              }}
            >
              Fire
            </button>
            <div>
              ${[
                state ? key(4, Child(4)) : key(1, Child3()),
                key(2, Child3()),
                key(3, Child(3)),
                state ? key(1, Child(1)) : key(4, Child(4)),
              ]}
              After
            </div>
          </div>
        `;
      };
    });
    render(App(), container);

    expect(container).toMatchSnapshot();

    const target = document.getElementById("target");
    target.dispatchEvent(new Event("click"));
    await wait(1);

    expect(container).toMatchSnapshot();
  });

  it("reconcile 26", async () => {
    const container = document.getElementById("app");

    const Child = component(() => k => `Child${k}`);

    const Child3 = component(() => () => []);

    const App = component(c => {
      let state = false;

      return () => {
        return html`
          <div>
            <button
              id="target"
              onclick=${() => {
                state = true;
                invalidate(c);
              }}
            >
              Fire
            </button>
            <div>
              ${[
                state ? key(4, Child(4)) : key(1, Child3()),
                key(2, Child3()),
                state ? key(1, Child(1)) : key(4, Child3()),
              ]}
              After
            </div>
          </div>
        `;
      };
    });
    render(App(), container);

    expect(container).toMatchSnapshot();

    const target = document.getElementById("target");
    target.dispatchEvent(new Event("click"));
    await wait(1);

    expect(container).toMatchSnapshot();
  });

  it("reconcile 27", async () => {
    const container = document.getElementById("app");

    const Child = component(() => k => `Child${k}`);

    const Child1 = component(() => () => "Test-Child1");

    const Child3 = component(() => () => []);

    const App = component(c => {
      let state = false;

      return () => {
        return html`
          <div>
            <button
              id="target"
              onclick=${() => {
                state = true;
                invalidate(c);
              }}
            >
              Fire
            </button>
            <div>
              ${[
                state ? key(4, Child3()) : key(1, Child3()),
                state ? key(2, Child(2)) : key(2, Child1()),
                state ? key(1, Child3()) : key(4, Child3()),
              ]}
              After
            </div>
          </div>
        `;
      };
    });
    render(App(), container);

    expect(container).toMatchSnapshot();

    const target = document.getElementById("target");
    target.dispatchEvent(new Event("click"));
    await wait(1);

    expect(container).toMatchSnapshot();
  });
});

describe("update", () => {
  beforeEach(() => {
    _resetTemplateCounter();

    document.body.innerHTML = "<div id='app'></div>";
  });

  const testUpdate = (state1, state2) => {
    const container = document.getElementById("app");

    const App = component(() => state => html`<div>${state}</div>`);

    render(App(state1), container);
    expect(container).toMatchSnapshot();

    render(App(state2), container);
    expect(container).toMatchSnapshot();
  };

  it("update 1", () => {
    testUpdate("one", "two");
  });

  it("update 2", () => {
    const Child = component(() => () => html`<span>child</span>`);
    testUpdate("one", Child());
  });

  it("update 3", () => {
    const Child = component(() => () => html`<span>child</span>`);
    testUpdate([Child()], []);
  });

  it("update 4", () => {
    const container = document.getElementById("app");

    const App = component(() => state => html`
      <div>${state} After content</div>
    `);

    const Child = component(() => () => html`<span>child</span>`);

    render(App([Child()]), container);
    expect(container).toMatchSnapshot();

    render(App([]), container);
    expect(container).toMatchSnapshot();
  });

  it("update 5", () => {
    const Child = component(() => () => html`<span>child</span>`);
    testUpdate([], [Child()]);
  });

  it("update 6", () => {
    testUpdate([], "text");
  });

  it("update 7", () => {
    const container = document.getElementById("app");

    const App = component(() => state => html`
      <div>${state} After content</div>
    `);

    render(App([]), container);
    expect(container).toMatchSnapshot();

    render(App("text"), container);
    expect(container).toMatchSnapshot();
  });

  it("update 8", () => {
    const Child = component(() => () => html`<span>child</span>`);
    testUpdate(Child(), Child());
  });

  it("update 9", () => {
    const Child = component(() => () => html`<span>child</span>`);
    testUpdate(Child(), "text");
  });

  it("update 10", () => {
    const container = document.getElementById("app");

    const App = component(() => state => html`<div class=${state} />`);

    render(App("one"), container);
    expect(container).toMatchSnapshot();

    render(App("two"), container);
    expect(container).toMatchSnapshot();
  });

  it("update 11", () => {
    const container = document.getElementById("app");

    const App = component(() => style => html`<div style=${style} />`);

    render(App({ color: "red" }), container);
    expect(container).toMatchSnapshot();

    render(App({ color: "blue" }), container);
    expect(container).toMatchSnapshot();
  });

  it("update 12", () => {
    const container = document.getElementById("app");

    const App = component(() => style => html`<div style=${style} />`);

    render(App({ color: "red" }), container);
    expect(container).toMatchSnapshot();

    render(App({}), container);
    expect(container).toMatchSnapshot();
  });

  it("update 13", () => {
    const container = document.getElementById("app");

    const App = component(() => style => html`<div style=${style} />`);

    render(App({ display: "block" }), container);
    expect(container).toMatchSnapshot();

    render(App({ display: "block", color: "red" }), container);
    expect(container).toMatchSnapshot();
  });

  it("update 14", () => {
    const container = document.getElementById("app");

    const App = component(() => id => html`<div id=${id} />`);

    render(App("test"), container);
    expect(container).toMatchSnapshot();

    render(App("test2"), container);
    expect(container).toMatchSnapshot();
  });

  it("update 15", () => {
    const container = document.getElementById("app");

    const App = component(() => id => html`<div data-testid=${id} />`);

    render(App("test"), container);
    expect(container).toMatchSnapshot();

    render(App("test2"), container);
    expect(container).toMatchSnapshot();
  });

  it("update 16", () => {
    const container = document.getElementById("app");

    const App = component(() => id => html`<div data-testid=${id} />`);

    render(App("test"), container);
    expect(container).toMatchSnapshot();

    render(App(false), container);
    expect(container).toMatchSnapshot();
  });

  it("update 17", () => {
    const container = document.getElementById("app");

    const App = component(() => state => html`<div>${state} ${"two"}</div>`);

    render(App("test"), container);
    expect(container).toMatchSnapshot();

    render(App([]), container);
    expect(container).toMatchSnapshot();
  });

  it("update 18", () => {
    const container = document.getElementById("app");

    const App = component(() => state => html`<div>${state} ${[]}</div>`);

    render(App("test"), container);
    expect(container).toMatchSnapshot();

    render(App([]), container);
    expect(container).toMatchSnapshot();
  });

  it("update 19", () => {
    const container = document.getElementById("app");

    const Child = component(() => () => html`<span>child</span>`);

    const App = component(() => state =>
      html`<div>${state} ${[Child()]}</div>`,
    );

    render(App("test"), container);
    expect(container).toMatchSnapshot();

    render(App([]), container);
    expect(container).toMatchSnapshot();
  });

  it("update 20", () => {
    const container = document.getElementById("app");

    const Child = component(() => () => html`<span>child</span>`);

    const App = component(() => state => html`<div>${state} ${Child()}</div>`);

    render(App("test"), container);
    expect(container).toMatchSnapshot();

    render(App([]), container);
    expect(container).toMatchSnapshot();
  });

  it("update 21", () => {
    const Child = component(c => {
      useUnmount(c, () => {});
      return () => html`<span>child</span>`;
    });
    testUpdate(Child(), "text");
  });

  it("update 22", () => {
    const Child = component(c => {
      useUnmount(c, () => {});
      useUnmount(c, () => {});
      useUnmount(c, () => {});
      return () => html`<span>child</span>`;
    });
    testUpdate(Child(), "text");
  });

  it("update 23", () => {
    const DeepChild = component(() => () => html`<span>deep child</span>`);
    const Child = component(() => () => html`<span>${DeepChild()}</span>`);
    testUpdate(Child(), "text");
  });

  it("update 24", () => {
    const DeepChild = component(() => () => html`<span>deep child</span>`);
    const Child = component(() => () => html`<span>${[DeepChild()]}</span>`);
    testUpdate(Child(), "text");
  });

  it("update 25", () => {
    const Child = component(() => () => html`<span>one</span><span>two</span>`);
    testUpdate(Child(), "text");
  });

  it("update 26", () => {
    const Child = component(() => v =>
      html`<span>First row: ${v}</span><span>Second row: ${v}</span>`,
    );
    testUpdate(
      [key(1, Child(1)), key(2, Child(2))],
      [key(2, Child(2)), key(1, Child(1))],
    );
  });

  it("update 27", () => {
    const Child = component(() => () => html`<span>chile</span>`);
    testUpdate("", Child());
  });

  it("update 28", () => {
    const container = document.getElementById("app");

    const App = component(() => style => html`<div style=${style} />`);

    render(App({ display: "block", color: "red" }), container);
    expect(container).toMatchSnapshot();

    render(App({ display: "block", color: "blue" }), container);
    expect(container).toMatchSnapshot();
  });
});

describe("events", () => {
  beforeEach(() => {
    _resetTemplateCounter();

    document.body.innerHTML = "<div id='app'></div>";
  });

  it("events 1", () => {
    const container = document.getElementById("app");

    let state = 0;
    const App = component(() => () =>
      html`<div id="target" onclick=${() => state++}>${"text"}</div>`,
    );

    render(App(), container);

    const target = document.getElementById("target");
    target.dispatchEvent(new Event("click"));

    expect(state).toBe(1);

    target.dispatchEvent(new Event("click"));
    expect(state).toBe(2);
  });

  it("events 2", () => {
    const container = document.getElementById("app");

    let state = 0;
    const Child = component(() => () =>
      html`<div id="target" onclick=${() => (state = 1)} />`,
    );
    const App = component(() => () => html`<div>${Child()}</div>`);

    render(App(), container);

    const target = document.getElementById("target");
    target.dispatchEvent(new Event("click"));

    expect(state).toBe(1);
  });

  it("events 3", () => {
    const container = document.getElementById("app");

    let state = 0;
    const Child = component(() => () =>
      html`<div id="target" onclick=${() => (state = 1)} />`,
    );
    const App = component(() => () => html`<div>${"test"}${Child()}</div>`);

    render(App(), container);

    const target = document.getElementById("target");
    target.dispatchEvent(new Event("click"));

    expect(state).toBe(1);
  });

  it("events 4", () => {
    const container = document.getElementById("app");

    let state = 0;
    const Child = component(() => () =>
      html`
        <div></div>
        <div id="target" onclick=${() => (state = 1)}></div>
      `,
    );
    const App = component(() => () => html`<div>${Child()}</div>`);

    render(App(), container);

    const target = document.getElementById("target");
    target.dispatchEvent(new Event("click"));

    expect(state).toBe(1);
  });

  it("events 5", () => {
    const container = document.getElementById("app");

    let state1 = 0;
    let state2 = 0;

    const Child = component(() => ({ id, onclick }) =>
      html`
        <div></div>
        <div id=${id} onclick=${onclick}></div>
      `,
    );
    const App = component(() => () =>
      html`<div>
        ${Child({ id: "target1", onclick: () => (state1 = 1) })}
        ${Child({ id: "target2", onclick: () => (state2 = 1) })}
      </div>`,
    );

    render(App(), container);

    const target = document.getElementById("target2");
    target.dispatchEvent(new Event("click"));

    expect(state2).toBe(1);
    expect(state1).toBe(0);
  });

  it("events 6", () => {
    const container = document.getElementById("app");

    let state1 = 0;
    let state2 = 0;
    const Child = component(() => ({ id, onclick }) =>
      html`<div id=${id} onclick=${onclick}></div>`,
    );
    const App = component(() => () =>
      html`<div>
        ${[Child({ id: "target1", onclick: () => (state1 = 1) })]}
        ${[Child({ id: "target2", onclick: () => (state2 = 1) })]}
      </div>`,
    );

    render(App(), container);

    const target = document.getElementById("target2");
    target.dispatchEvent(new Event("click"));

    expect(state2).toBe(1);
    expect(state1).toBe(0);
  });

  it("events 7", () => {
    const container = document.getElementById("app");

    let state1 = 0;
    let state2 = 0;
    const Child = component(() => ({ id, onclick }) =>
      html`
        <div></div>
        <div id=${id} onclick=${onclick}></div>
      `,
    );
    const App = component(() => () =>
      html`<div>
        ${[Child({ id: "target1", onclick: () => (state1 = 1) })]}
        ${[Child({ id: "target2", onclick: () => (state2 = 1) })]}
      </div>`,
    );

    render(App(), container);

    const target = document.getElementById("target2");
    target.dispatchEvent(new Event("click"));

    expect(state2).toBe(1);
    expect(state1).toBe(0);
  });

  it("events 8", () => {
    const container = document.getElementById("app");

    let state = 0;
    const App = component(() => () =>
      html`
        <div id="target" onkeydown=${() => {}} onclick=${() => state++}>
          <div onclick=${() => {}}></div>
        </div>
      `,
    );

    render(App(), container);

    const target = document.getElementById("target");
    target.dispatchEvent(new Event("click"));

    expect(state).toBe(1);

    target.dispatchEvent(new Event("click"));
    expect(state).toBe(2);
  });

  it("events 9", () => {
    const container = document.getElementById("app");

    let state = 0;
    const Child = component(() => () =>
      html`<div onclick=${() => state++}></div>`,
    );
    const App = component(() => () =>
      html`
        <div>
          ${Child()}
          <div id="target"></div>
        </div>
      `,
    );

    render(App(), container);

    const target = document.getElementById("target");
    target.dispatchEvent(new Event("click"));

    expect(state).toBe(0);
  });

  it("events 10", () => {
    const container = document.getElementById("app");

    let state = 0;
    const Child = component(() => () =>
      html`<div onclick=${() => (state = 1)} />`,
    );
    const App = component(() => () =>
      html`<div id="target">${"test"}${Child()}</div>`,
    );

    render(App(), container);

    const target = document.getElementById("target");
    target.firstChild.dispatchEvent(new Event("click"));

    expect(state).toBe(0);
  });
});

describe("invalidate", () => {
  beforeEach(() => {
    _resetTemplateCounter();

    document.body.innerHTML = "<div id='app'></div>";
  });

  it("invalidate 1", async () => {
    const container = document.getElementById("app");

    let renderCount = 0;
    const App = component(c => {
      let state = 0;
      return () => {
        renderCount++;

        return html`
          <div
            id="target"
            onclick=${() => {
              state++;
              invalidate(c);
              invalidate(c);
            }}
          >
            ${state}
          </div>
        `;
      };
    });
    render(App(), container);
    expect(renderCount).toBe(1);

    expect(container).toMatchSnapshot();

    const target = document.getElementById("target");
    target.dispatchEvent(new Event("click"));
    await wait(1);

    expect(container).toMatchSnapshot();
    expect(renderCount).toBe(2);
  });

  it("invalidate 2", async () => {
    const container = document.getElementById("app");

    const Child = component(c => {
      let state = 0;
      return onchange => {
        return html`
          <div
            id="target"
            onclick=${() => {
              state += 2;
              invalidate(c);

              onchange(state);
            }}
          >
            ${state}
          </div>
        `;
      };
    });

    const App = component(c => {
      let state = 0;
      return () =>
        html`
          <div>
            ${Child(next => {
              state = next;
              invalidate(c);
            })}
            ${state}
          </div>
        `;
    });
    render(App(), container);

    expect(container).toMatchSnapshot();

    const target = document.getElementById("target");
    target.dispatchEvent(new Event("click"));
    await wait(1);

    expect(container).toMatchSnapshot();
  });
});
