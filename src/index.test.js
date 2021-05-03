import {
  html,
  render,
  component,
  _resetTemplateCounter,
  key,
  useUnmount,
  invalidate,
  propertyToAttribute,
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

  const testRawInsertion = template => {
    expect(template).toMatchSnapshot();

    const container = document.getElementById("app");
    const App = component(() => () => template);
    render(App(), container);

    expect(container).toMatchSnapshot();

    return container;
  };

  const testFragment = template => {
    template.forEach(template => {
      if (typeof template === "object") {
        expect(template.p).toMatchSnapshot();
      } else {
        expect(template).toMatchSnapshot();
      }
    });

    const container = document.getElementById("app");
    const App = component(() => () => template);
    render(App(), container);

    expect(container).toMatchSnapshot();

    return container;
  };

  describe("basic", () => {
    it("basic 01", () => {
      testTemplate(html`<div></div>`);
    });

    it("basic 02", () => {
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

    it("basic 03", () => {
      testTemplate(html`
        <div>
          <span>Space should be preserved when on single line </span>
          <div></div>
        </div>
      `);
    });

    it("basic 04", () => {
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

    it("basic 05", () => {
      testTemplate(
        html`
          <button id="test1" class=${"value2"} disabled>
            class=value2 disabled
          </button>
        `,
      );
    });

    it("basic 06", () => {
      testTemplate(
        html`
          <button id="test1" disabled class=${"value2"}>
            class=value2 disabled
          </button>
        `,
      );
    });

    it("basic 07", () => {
      testTemplate(html`<input id="test1" class=${"value2"} disabled />`);
    });

    it("basic 08", () => {
      const container = testTemplate(
        html`<input type=${"checkbox"} checked=${true} class=${"some"} />`,
      );

      const checkbox = container.firstChild;
      expect(checkbox.checked).toBe(true);
    });

    it("basic 09", () => {
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

    it("basic 13", () => {
      testTemplate(html`
        <div>
          <div class=${""}></div>
          <div class=${"   "}></div>
          <div class=${null}></div>
          <div class=${undefined}></div>
          <div class=${"   test   "}></div>
          <div className=${"test"}></div>
        </div>
      `);
    });

    it("basic 14", () => {
      testTemplate(html`
        <div>
          <div style=${{}}></div>
          <div style=${null}></div>
          <div style=${undefined}></div>
          <div style=${{ display: undefined }}></div>
          <div style=${{ display: null }}></div>
        </div>
      `);
    });

    it("basic 15", () => {
      testTemplate(html`
        <div>
          <div id=${null} data-testid=${null}></div>
        </div>
      `);
    });

    it("basic 16", () => {
      testTemplate(html` <div id="target">Web Component ${"World"}</div> `);
    });

    it("basic 17", () => {
      testTemplate(
        // prettier-ignore
        html`
          <div>
            Hello
            <x-search-4
              name=${"World"}
              onclick=${() => {}}
            ></x-search-4>
            !
          </div>
        `,
      );
    });

    it("basic 18", () => {
      testTemplate(
        // prettier-ignore
        html`<div onclick=${() => {}} id="target">
          Web Component ${"World"}
        </div>`,
      );
    });
  });

  describe("afterNode", () => {
    it("afterNode 01", () => {
      testTemplate(html`
        <div>
          ${1}
          <div></div>
        </div>
      `);
    });

    it("afterNode 02", () => {
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
    it("fragments 01", () => {
      testFragment(
        html`
          <div></div>
          <div></div>
        `,
      );
    });

    it("fragments 02", () => {
      testFragment(
        html`
          <div>${1}</div>
          <div>${2}</div>
        `,
      );
    });
  });

  describe("dynamic roots", () => {
    it("dynamic 01", () => {
      testRawInsertion(html`${"Content"}`);
    });

    it("dynamic 02", () => {
      testFragment(html`
        <div>Header ${"left"}</div>
        ${"Content"} ${"After"}
        <div>Footer ${"right"}</div>
      `);
    });

    it("dynamic 03", () => {
      testFragment(html`Header ${"Content"} After`);
    });

    it("dynamic 04", () => {
      testFragment(html`
        Count: ${0}
        <button onclick=${() => {}}>Reset</button>
        <button onclick=${() => {}}>+</button>
        <button onclick=${() => {}}>-</button>
      `);
    });

    it("dynamic 05", () => {
      testFragment(html`Hello ${"World"}`);
    });
  });

  describe("mixed content", () => {
    it("mixed 01", () => {
      testTemplate(html`<div>Hello ${"World"}</div>`);
    });

    it("mixed 02", () => {
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

    it("mixed 03", () => {
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

    it("mixed 04", () => {
      testFragment(
        html`
          <div></div>
          <div>
            <div></div>
            <div>Zero ${"First"} Second ${"Third"} Fourth ${"Fifth"}</div>
          </div>
        `,
      );
    });

    it("mixed 05", () => {
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

    it("mixed 06", () => {
      testTemplate(
        html`<div>Zero ${"First"} Second ${"Third"} Fourth ${"Fifth"}</div>`,
      );
    });

    it("mixed 07", () => {
      testTemplate(
        html`<div>${"First"} Second ${"Third"} Fourth ${"Fifth"}</div>`,
      );
    });

    it("mixed 08", () => {
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

    it("mixed 09", () => {
      testTemplate(
        html`
          <div>
            <input class=${"some"} />
            Zero
            <div>First</div>
            Second
            <div>Third</div>
            Fourth
            <input class=${"some"} />
            Fifth ${"Sixth"} <input /> Seventh ${"Eighth"}
          </div>
        `,
      );
    });

    it("mixed 10", () => {
      testFragment(
        html`
          <div>
            <input class=${"some"} />
            Zero
            <div>First</div>
            Second
            <div>Third</div>
            Fourth
            <input class=${"some"} />
            Fifth ${"Sixth"} <input /> Seventh ${"Eighth"}
          </div>
          <div>
            <input class=${"some"} />
            Zero
            <div>First</div>
            Second
            <div>Third</div>
            Fourth
            <input class=${"some"} />
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
      testFragment(
        html`
          <div onclick=${() => {}}>First row: ${1}</div>
          <div onclick=${() => {}}>Second row: ${2}</div>
        `,
      );
    });

    it("mixed 15", () => {
      testFragment(
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

  it("reconcile 01", () => {
    testReconcile([1, 2], [3, 4, 1, 2]);
  });

  it("reconcile 02", () => {
    testReconcile([1, 2], [1, 3, 4, 2]);
  });

  it("reconcile 03", () => {
    testReconcile([1, 2, 3, 4, 5, 6], [1, 5, 3, 4, 2, 6]);
  });

  it("reconcile 04", () => {
    testReconcile([1, 2, 3, 4, 5], [1, 4, 3, 2, 5]);
  });

  it("reconcile 05", () => {
    testReconcile([1, 2, 3, 4, 5], [5, 4, 3, 2, 1]);
  });

  it("reconcile 06", () => {
    testReconcile([1, 2, 3, 4, 5, 6], [6, 5, 4, 3, 2, 1]);
  });

  it("reconcile 07", () => {
    testReconcile([1, 2, 3, 4, 5, 6], [2, 3, 4, 5, 6, 1]);
  });

  it("reconcile 08", () => {
    testReconcile([1, 2, 3, 4, 5, 6], [3, 4, 5, 6, 1, 2]);
  });

  it("reconcile 09", () => {
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

  it("reconcile 28", async () => {
    const container = document.getElementById("app");

    render(
      [null, undefined, true, false, key(1, "Item"), key(2, null)],
      container,
    );

    expect(container).toMatchSnapshot();

    render(
      [null, undefined, true, false, key(1, "Item"), key(2, "Text")],
      container,
    );

    expect(container).toMatchSnapshot();
  });

  it("reconcile 29", async () => {
    const container = document.getElementById("app");

    render([key(1, ["First"]), key(2, ["Second"])], container);

    expect(container).toMatchSnapshot();

    render([key(2, ["Second"]), key(1, ["First"])], container);

    expect(container).toMatchSnapshot();
  });

  it("reconcile 30", async () => {
    const container = document.getElementById("app");

    render([key(1, null), key(2, null)], container);

    expect(container).toMatchSnapshot();

    render([key(2, null), key(1, null)], container);

    expect(container).toMatchSnapshot();
  });

  it("reconcile 31", async () => {
    const container = document.getElementById("app");

    render([key(1, null), key(2, "2"), key(3, "3"), "After"], container);

    expect(container).toMatchSnapshot();

    render([key(2, "2"), key(3, "3"), key(1, null), "After"], container);

    expect(container).toMatchSnapshot();
  });

  it("reconcile 32", async () => {
    const container = document.getElementById("app");

    render([key(1, "1"), key(2, null), key(3, "3"), "After"], container);

    expect(container).toMatchSnapshot();

    render([key(3, "3"), key(1, "1"), key(2, null), "After"], container);

    expect(container).toMatchSnapshot();
  });

  it("reconcile 33", async () => {
    const container = document.getElementById("app");

    render(
      [key(1, "Before"), key(2, "2"), key(3, null), key(4, "After")],
      container,
    );

    expect(container).toMatchSnapshot();

    render(
      [key(6, "Before"), key(2, null), key(3, null), key(4, "After")],
      container,
    );

    expect(container).toMatchSnapshot();
  });

  it("reconcile 34", async () => {
    const container = document.getElementById("app");

    const App = state => {
      return html`
        <div>
          ${state ? "Text" : html`<div></div>`} ${[null, null, "After"]}
        </div>
      `;
    };

    render(App(true), container);

    expect(container).toMatchSnapshot();

    render(App(false), container);

    expect(container).toMatchSnapshot();
  });

  it("reconcile 35", () => {
    testReconcile([1, 2, 3, 4, 5], [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
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

  it("update 01", () => {
    testUpdate("one", "two");
  });

  it("update 02", () => {
    const Child = component(() => () => html`<span>child</span>`);
    testUpdate("one", Child());
  });

  it("update 03", () => {
    const Child = component(() => () => html`<span>child</span>`);
    testUpdate([Child()], []);
  });

  it("update 04", () => {
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

  it("update 05", () => {
    const Child = component(() => () => html`<span>child</span>`);
    testUpdate([], [Child()]);
  });

  it("update 06", () => {
    testUpdate([], "text");
  });

  it("update 07", () => {
    const container = document.getElementById("app");

    const App = component(() => state => html`
      <div>${state} After content</div>
    `);

    render(App([]), container);
    expect(container).toMatchSnapshot();

    render(App("text"), container);
    expect(container).toMatchSnapshot();
  });

  it("update 08", () => {
    const Child = component(() => () => html`<span>child</span>`);
    testUpdate(Child(), Child());
  });

  it("update 09", () => {
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

  it("update 29", () => {
    const container = document.getElementById("app");

    const App = component(() => () => null);

    render(App(), container);
    expect(container).toMatchSnapshot();

    render(null, container);
    expect(container).toMatchSnapshot();
  });

  it("update 30", () => {
    const container = document.getElementById("app");

    const App = component(() => () => "");

    render(App(), container);
    expect(container).toMatchSnapshot();

    render(null, container);
    expect(container).toMatchSnapshot();
  });

  it("update 31", () => {
    const container = document.getElementById("app");

    let state = false;

    const App = () => {
      return html`<div>${state ? "Some" : ["First"]}</div>`;
    };

    render(App(), container);
    expect(container).toMatchSnapshot();

    state = true;
    render(App(), container);
    expect(container).toMatchSnapshot();
  });

  it("update 32", () => {
    const container = document.getElementById("app");

    let state = false;

    const App = () => {
      return html`
        <div>
          <div class=${state ? "" : "cool"}></div>
          <div class=${state ? "    " : "cool"}></div>
          <div class=${state ? null : "cool"}></div>
          <div class=${state ? undefined : "cool"}></div>
          <div class=${state ? "    cool    " : "cool"}></div>
        </div>
      `;
    };

    render(App(), container);
    expect(container).toMatchSnapshot();

    state = true;
    render(App(), container);
    expect(container).toMatchSnapshot();
  });

  it("update 33", () => {
    const container = document.getElementById("app");

    let state = false;

    const App = () => {
      return html`
        <div>
          <div style=${state ? {} : { display: "none" }}></div>
          <div style=${state ? null : { display: "none" }}></div>
          <div style=${state ? undefined : { display: "none" }}></div>
          <div style=${state ? { display: null } : { display: "none" }}></div>
          <div
            style=${state ? { display: undefined } : { display: "none" }}
          ></div>
        </div>
      `;
    };

    render(App(), container);
    expect(container).toMatchSnapshot();

    state = true;
    render(App(), container);
    expect(container).toMatchSnapshot();
  });

  it("update 34", () => {
    const container = document.getElementById("app");

    let state = false;

    const App = () => {
      return html`
        <div>
          <div
            id=${state ? null : "me"}
            data-testid=${state ? null : "me"}
          ></div>
        </div>
      `;
    };

    render(App(), container);
    expect(container).toMatchSnapshot();

    state = true;
    render(App(), container);
    expect(container).toMatchSnapshot();
  });

  it("update 35", () => {
    const container = document.getElementById("app");

    let state = true;

    const App = () => {
      return html`
        <div>
          <input id="checkbox" type="checkbox" defaultChecked=${state} />
          <input id="checkbox-controlled" type="checkbox" checked=${state} />
          <input id="input" type="text" defaultValue=${String(state)} />
          <input id="input-controlled" type="text" value=${String(state)} />
        </div>
      `;
    };

    render(App(), container);
    expect(container).toMatchSnapshot();

    expect(document.getElementById("checkbox").checked).toBe(true);
    expect(document.getElementById("checkbox-controlled").checked).toBe(true);
    expect(document.getElementById("input").value).toBe("true");
    expect(document.getElementById("input-controlled").value).toBe("true");

    state = false;
    render(App(), container);
    expect(container).toMatchSnapshot();

    expect(document.getElementById("checkbox").checked).toBe(true);
    expect(document.getElementById("checkbox-controlled").checked).toBe(false);
    expect(document.getElementById("input").value).toBe("true");
    expect(document.getElementById("input-controlled").value).toBe("false");
  });

  it("update 36", () => {
    const container = document.getElementById("app");

    let state = false;

    const App = () => {
      return html`
        <div>
          <div innerHTML=${state ? "mo" : "me"}></div>
        </div>
      `;
    };

    render(App(), container);
    expect(container).toMatchSnapshot();

    render(App(), container);
    expect(container).toMatchSnapshot();
  });
});

describe("events", () => {
  beforeEach(() => {
    _resetTemplateCounter();

    document.body.innerHTML = "<div id='app'></div>";
  });

  it("events 01", () => {
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

  it("events 02", () => {
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

  it("events 03", () => {
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

  it("events 04", () => {
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

  it("events 05", () => {
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

  it("events 06", () => {
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

  it("events 07", () => {
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

  it("events 08", () => {
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

  it("events 09", () => {
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

  it("events 11", () => {
    const container = document.getElementById("app");

    let state = 0;

    render(
      html`
        <div>
          ${html`
            <div></div>
            <div></div>
          `}
          ${html`<div id="target" onclick=${() => (state = 1)}></div>`}
        </div>
      `,
      container,
    );
    expect(container).toMatchSnapshot();

    const target = document.getElementById("target");
    target.dispatchEvent(new Event("click"));

    expect(state).toBe(1);
  });

  it("events 12", () => {
    const container = document.getElementById("app");

    let state = 0;

    render(
      html`
        <div>
          ${html`
            <div></div>
            <div id="target" onclick=${() => (state = 1)}></div>
          `}
        </div>
      `,
      container,
    );
    expect(container).toMatchSnapshot();

    const target = document.getElementById("target");
    target.dispatchEvent(new Event("click"));

    expect(state).toBe(1);
  });

  it("events 13", () => {
    const container = document.getElementById("app");

    let state = 0;

    render(
      html`
        <div>
          ${html`<div></div>`}
          ${html`<div id="target" onclick=${() => (state = 1)}></div>`}
        </div>
      `,
      container,
    );
    expect(container).toMatchSnapshot();

    const target = document.getElementById("target");
    target.dispatchEvent(new Event("click"));

    expect(state).toBe(1);
  });

  it("events 14", () => {
    const container = document.getElementById("app");

    let state = 0;

    render(
      ["First", html`<div id="target" onclick=${() => (state = 1)}></div>`],
      container,
    );
    expect(container).toMatchSnapshot();

    const target = document.getElementById("target");
    target.dispatchEvent(new Event("click"));

    expect(state).toBe(1);
  });

  it("events 15", () => {
    const container = document.getElementById("app");

    let state = 0;

    render(
      [["First"], html`<div id="target" onclick=${() => (state = 1)}></div>`],
      container,
    );
    expect(container).toMatchSnapshot();

    const target = document.getElementById("target");
    target.dispatchEvent(new Event("click"));

    expect(state).toBe(1);
  });

  it("events 16", () => {
    const container = document.getElementById("app");

    let state = 0;

    render(
      [null, html`<div id="target" onclick=${() => (state = 1)}></div>`],
      container,
    );
    expect(container).toMatchSnapshot();

    const target = document.getElementById("target");
    target.dispatchEvent(new Event("click"));

    expect(state).toBe(1);
  });

  it("events 17", () => {
    const container = document.getElementById("app");

    let state = 0;

    render(
      html`
        <div>
          ${null} ${html`<div id="target" onclick=${() => (state = 1)}></div>`}
        </div>
      `,
      container,
    );
    expect(container).toMatchSnapshot();

    const target = document.getElementById("target");
    target.dispatchEvent(new Event("click"));

    expect(state).toBe(1);
  });

  it("events 18", () => {
    const container = document.getElementById("app");

    let state = 0;

    render(null, container);
    expect(container).toMatchSnapshot();

    container.dispatchEvent(new Event("click"));

    expect(state).toBe(0);
  });

  it("events 19", () => {
    const container = document.getElementById("app");

    let state = 0;

    render([], container);
    expect(container).toMatchSnapshot();

    container.dispatchEvent(new Event("click"));

    expect(state).toBe(0);
  });

  it("events 20", () => {
    const container = document.getElementById("app");

    let state = 0;

    render(html`<div id="target" onclick=${null}></div>`, container);
    expect(container).toMatchSnapshot();

    const target = document.getElementById("target");
    target.dispatchEvent(new Event("click"));

    expect(state).toBe(0);
  });

  it("events 21", () => {
    const container = document.getElementById("app");

    let state = 0;

    render(html`<div id="target" onclick=${undefined}></div>`, container);
    expect(container).toMatchSnapshot();

    const target = document.getElementById("target");
    target.dispatchEvent(new Event("click"));

    expect(state).toBe(0);
  });

  it("events 22", () => {
    const container = document.getElementById("app");

    let state = 0;
    const App = component(() => () =>
      html`
        <div>
          <div id="target" onclick=${() => state++}>${"text"}</div>
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

  it("events 23", () => {
    const container = document.getElementById("app");

    let state = 0;
    const App = component(() => () =>
      html` <div id="target" onclick=${() => state++}>${"text"}</div> `,
    );

    render(App(), container);

    const target = document.getElementById("target").firstChild;
    target.dispatchEvent(new Event("click"));

    expect(state).toBe(0);
  });

  it("events 24", () => {
    const container = document.getElementById("app");

    let state = 0;
    const App = component(() => () =>
      html`
        <div>
          <div id="target" onclick=${() => state++}>${"text"}</div>
        </div>
      `,
    );

    render(App(), container);

    const target = document.getElementById("target").firstChild;
    target.dispatchEvent(new Event("click"));

    expect(state).toBe(0);
  });

  it("events 25", () => {
    const container = document.getElementById("app");

    let state = 0;
    const App = component(() => () =>
      html`
        <div onclick=${() => state++}>
          <div id="target"></div>
        </div>
      `,
    );

    render(App(), container);

    const target = document.getElementById("target");
    target.dispatchEvent(new Event("click", { bubbles: true }));

    expect(state).toBe(1);
  });

  it("events 26", () => {
    const container = document.getElementById("app");

    let state = 0;
    const App = component(() => () =>
      html`
        <div onclick=${() => state++}>
          <div>
            <div id="target"></div>
          </div>
        </div>
      `,
    );

    render(App(), container);

    const target = document.getElementById("target");
    target.dispatchEvent(new Event("click", { bubbles: true }));

    expect(state).toBe(1);
  });

  it("events 27", () => {
    const container = document.getElementById("app");

    let state = 0;
    const App = component(() => () =>
      html`
        <div onany=${() => state++}>
          <div>
            <div id="target"></div>
          </div>
        </div>
      `,
    );

    render(App(), container);

    const target = document.getElementById("target");
    target.dispatchEvent(new Event("click", { bubbles: true }));

    expect(state).toBe(0);
  });

  it("events 28", () => {
    const container = document.getElementById("app");

    let state = 0;
    const App = component(() => () =>
      html`
        <div onclick=${null}>
          <div>
            <div id="target"></div>
          </div>
        </div>
      `,
    );

    render(App(), container);

    const target = document.getElementById("target");
    target.dispatchEvent(new Event("click", { bubbles: true }));

    expect(state).toBe(0);
  });

  it("events 29", () => {
    const container = document.getElementById("app");
    container.dispatchEvent(new Event("click", { bubbles: true }));
  });

  it("events 30", () => {
    const container = document.getElementById("app");

    let state = 0;
    const App = component(() => () =>
      html`
        <div>
          ${"Text"}
          <div id="target" onclick=${() => state++}></div>
        </div>
      `,
    );

    render(App(), container);

    const target = document.getElementById("target");
    target.dispatchEvent(new Event("click"));

    expect(state).toBe(1);
  });

  it("events 31", () => {
    const container = document.getElementById("app");

    const order = [];

    const App = component(() => () =>
      html`
        <div onfocus=${() => order.push("parent")}>
          <div id="target" onclick=${() => order.push("target")}></div>
        </div>
      `,
    );

    render(App(), container);

    const target = document.getElementById("target");
    target.dispatchEvent(new Event("click", { bubbles: true }));

    expect(order).toEqual(["target"]);
  });

  describe("bubbling", () => {
    it("bubbling 01", () => {
      const container = document.getElementById("app");

      const order = [];

      render(
        html`
          <div onclick=${() => order.push("parent")}>
            <div id="target" onclick=${() => order.push("target")}></div>
          </div>
        `,
        container,
      );
      expect(container).toMatchSnapshot();

      const target = document.getElementById("target");
      target.dispatchEvent(new Event("click", { bubbles: true }));

      expect(order).toEqual(["target", "parent"]);
    });

    it("bubbling 02", () => {
      const container = document.getElementById("app");

      const order = [];

      const Child = html`
        <div id="target" onclick=${() => order.push("target")}></div>
      `;

      render(
        html`<div onclick=${() => order.push("parent")}>${Child}</div>`,
        container,
      );
      expect(container).toMatchSnapshot();

      const target = document.getElementById("target");
      target.dispatchEvent(new Event("click", { bubbles: true }));

      expect(order).toEqual(["target", "parent"]);
    });

    it("bubbling 03", () => {
      const container = document.getElementById("app");

      const order = [];

      render(
        html`
          <div onclick=${() => order.push("parent")}>
            <div id="target"></div>
          </div>
        `,
        container,
      );
      expect(container).toMatchSnapshot();

      const target = document.getElementById("target");
      target.dispatchEvent(new Event("click"));

      expect(order).toEqual([]);
    });

    describe("stopPropagation", () => {
      it("stopPropagation 01", () => {
        const container = document.getElementById("app");

        const order = [];

        render(
          html`
            <div onclick=${() => order.push("parent")}>
              <div
                id="target"
                onclick=${e => {
                  order.push("target");
                  e.stopPropagation();
                }}
              ></div>
            </div>
          `,
          container,
        );
        expect(container).toMatchSnapshot();

        const target = document.getElementById("target");
        target.dispatchEvent(new Event("click"));

        expect(order).toEqual(["target"]);
      });

      it("stopPropagation 02", () => {
        const container = document.getElementById("app");

        const order = [];

        const Child = html`
          <div
            id="target"
            onclick=${e => {
              order.push("target");
              e.stopPropagation();
            }}
          ></div>
        `;

        render(
          html`<div onclick=${() => order.push("parent")}>${Child}</div>`,
          container,
        );
        expect(container).toMatchSnapshot();

        const target = document.getElementById("target");
        target.dispatchEvent(new Event("click"));

        expect(order).toEqual(["target"]);
      });

      it("stopPropagation 03", () => {
        const container = document.getElementById("app");

        const order = [];

        const Child = html`
          <div
            id="target"
            onclick=${e => {
              order.push("target");
            }}
          ></div>
        `;

        render(
          html`
            <div onclick=${() => order.push("parent")}>
              <div
                onclick=${e => {
                  order.push("child");
                  e.stopPropagation();
                }}
              >
                ${Child}
              </div>
            </div>
          `,
          container,
        );
        expect(container).toMatchSnapshot();

        const target = document.getElementById("target");
        target.dispatchEvent(new Event("click", { bubbles: true }));

        expect(order).toEqual(["target", "child"]);
      });
    });
  });
});

describe("invalidate", () => {
  beforeEach(() => {
    _resetTemplateCounter();

    document.body.innerHTML = "<div id='app'></div>";
  });

  it("invalidate 01", async () => {
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

  it("invalidate 02", async () => {
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

  it("invalidate 03", async () => {
    const container = document.getElementById("app");

    let state = false;
    let appRef;

    const App = component(c => {
      appRef = c;

      return () => {
        return state ? html`<div>True</div>` : html`<span>False</span>`;
      };
    });

    render(App(), container);

    expect(container).toMatchSnapshot();

    state = true;
    invalidate(appRef);
    await wait(1);

    expect(container).toMatchSnapshot();
  });

  it("invalidate 04", async () => {
    const container = document.getElementById("app");

    let state = false;
    let appRef;

    const App = component(c => {
      appRef = c;

      return () => {
        return state ? html`<div>True</div>` : [];
      };
    });

    render(App(), container);

    expect(container).toMatchSnapshot();

    state = true;
    invalidate(appRef);
    await wait(1);

    expect(container).toMatchSnapshot();
  });

  it("invalidate 05", async () => {
    const container = document.getElementById("app");

    let state = false;
    let appRef;

    const App = component(c => {
      appRef = c;

      return () => {
        return state ? html`<div>True</div>` : "False";
      };
    });

    render(App(), container);

    expect(container).toMatchSnapshot();

    state = true;
    invalidate(appRef);
    await wait(1);

    expect(container).toMatchSnapshot();
  });

  it("invalidate 06", async () => {
    const container = document.getElementById("app");

    let state = false;
    let appRef;

    const App = component(c => {
      appRef = c;

      return () => {
        return state ? html`<div>True</div>` : "False";
      };
    });

    render(html`<div>${App()}</div>`, container);

    expect(container).toMatchSnapshot();

    state = true;
    invalidate(appRef);
    await wait(1);

    expect(container).toMatchSnapshot();
  });

  it("invalidate 07", async () => {
    const container = document.getElementById("app");

    let state = false;
    let appRef;

    const App = component(c => {
      appRef = c;

      return () => {
        return state ? html`<div>True</div>` : "False";
      };
    });

    render([App()], container);

    expect(container).toMatchSnapshot();

    state = true;
    invalidate(appRef);
    await wait(1);

    expect(container).toMatchSnapshot();
  });

  it("invalidate 08", async () => {
    const container = document.getElementById("app");

    let state = false;
    let appRef;

    const App = component(c => {
      appRef = c;

      return () => {
        return state ? html`<div>True</div>` : "False";
      };
    });

    render([App(), "After"], container);

    expect(container).toMatchSnapshot();

    state = true;
    invalidate(appRef);
    await wait(1);

    expect(container).toMatchSnapshot();
  });

  it("invalidate 09", async () => {
    const container = document.getElementById("app");

    let state = false;
    let appRef;

    const App = component(c => {
      appRef = c;

      return () => {
        return state ? html`<div>True</div>` : "False";
      };
    });

    render([App(), null, "After"], container);

    expect(container).toMatchSnapshot();

    state = true;
    invalidate(appRef);
    await wait(1);

    expect(container).toMatchSnapshot();
  });

  it("invalidate 10", async () => {
    const container = document.getElementById("app");

    let state = false;
    let appRef;

    const Child = component(c => {
      appRef = c;

      return () => {
        return state ? html`<div>True</div>` : "False";
      };
    });

    const App = component(() => () => Child());

    render([App(), null, "After"], container);

    expect(container).toMatchSnapshot();

    state = true;
    invalidate(appRef);
    await wait(1);

    expect(container).toMatchSnapshot();
  });

  it("invalidate 11", async () => {
    const container = document.getElementById("app");

    let state = false;
    let appRef;

    const App = component(c => {
      appRef = c;

      return () => {
        return state ? html`<div>True</div>` : "False";
      };
    });

    render(html` <div>${App()} ${"After"}</div> `, container);

    expect(container).toMatchSnapshot();

    state = true;
    invalidate(appRef);
    await wait(1);

    expect(container).toMatchSnapshot();
  });

  it("invalidate 12", async () => {
    const container = document.getElementById("app");

    let state = false;
    let appRef;

    const App = component(c => {
      appRef = c;

      return () => {
        return state ? html`<div>True</div>` : "False";
      };
    });

    render(
      html`
        <div class="body">
          ${html`<div class="content">${App()}</div>`} ${"After"}
        </div>
      `,
      container,
    );

    expect(container).toMatchSnapshot();

    state = true;
    invalidate(appRef);
    await wait(1);

    expect(container).toMatchSnapshot();
  });
});

describe("propertyToAttribute", () => {
  const testValue = (input, output) => {
    it(`${input} -> ${output}`, () => {
      expect(propertyToAttribute(input)).toBe(output);
    });
  };

  // HTML properties list taken from:
  // https://github.com/wooorm/property-information

  testValue("aLink", "alink");
  testValue("abbr", "abbr");
  testValue("accept", "accept");
  testValue("acceptCharset", "accept-charset");
  testValue("accessKey", "accesskey");
  testValue("action", "action");
  testValue("align", "align");
  testValue("allow", "allow");
  testValue("allowFullScreen", "allowfullscreen");
  testValue("allowPaymentRequest", "allowpaymentrequest");
  testValue("allowTransparency", "allowtransparency");
  testValue("allowUserMedia", "allowusermedia");
  testValue("alt", "alt");
  testValue("archive", "archive");
  testValue("ariaActiveDescendant", "aria-activedescendant");
  testValue("ariaAtomic", "aria-atomic");
  testValue("ariaAutoComplete", "aria-autocomplete");
  testValue("ariaBusy", "aria-busy");
  testValue("ariaChecked", "aria-checked");
  testValue("ariaColCount", "aria-colcount");
  testValue("ariaColIndex", "aria-colindex");
  testValue("ariaColSpan", "aria-colspan");
  testValue("ariaControls", "aria-controls");
  testValue("ariaCurrent", "aria-current");
  testValue("ariaDescribedBy", "aria-describedby");
  testValue("ariaDetails", "aria-details");
  testValue("ariaDisabled", "aria-disabled");
  testValue("ariaDropEffect", "aria-dropeffect");
  testValue("ariaErrorMessage", "aria-errormessage");
  testValue("ariaExpanded", "aria-expanded");
  testValue("ariaFlowTo", "aria-flowto");
  testValue("ariaGrabbed", "aria-grabbed");
  testValue("ariaHasPopup", "aria-haspopup");
  testValue("ariaHidden", "aria-hidden");
  testValue("ariaInvalid", "aria-invalid");
  testValue("ariaKeyShortcuts", "aria-keyshortcuts");
  testValue("ariaLabel", "aria-label");
  testValue("ariaLabelledBy", "aria-labelledby");
  testValue("ariaLevel", "aria-level");
  testValue("ariaLive", "aria-live");
  testValue("ariaModal", "aria-modal");
  testValue("ariaMultiLine", "aria-multiline");
  testValue("ariaMultiSelectable", "aria-multiselectable");
  testValue("ariaOrientation", "aria-orientation");
  testValue("ariaOwns", "aria-owns");
  testValue("ariaPlaceholder", "aria-placeholder");
  testValue("ariaPosInSet", "aria-posinset");
  testValue("ariaPressed", "aria-pressed");
  testValue("ariaReadOnly", "aria-readonly");
  testValue("ariaRelevant", "aria-relevant");
  testValue("ariaRoleDescription", "aria-roledescription");
  testValue("ariaRowCount", "aria-rowcount");
  testValue("ariaRowIndex", "aria-rowindex");
  testValue("ariaRowSpan", "aria-rowspan");
  testValue("ariaSelected", "aria-selected");
  testValue("ariaSetSize", "aria-setsize");
  testValue("ariaSort", "aria-sort");
  testValue("ariaValueMax", "aria-valuemax");
  testValue("ariaValueMin", "aria-valuemin");
  testValue("ariaValueNow", "aria-valuenow");
  testValue("ariaValueText", "aria-valuetext");
  testValue("as", "as");
  testValue("async", "async");
  testValue("autoCapitalize", "autocapitalize");
  testValue("autoComplete", "autocomplete");
  testValue("autoCorrect", "autocorrect");
  testValue("autoFocus", "autofocus");
  testValue("autoPlay", "autoplay");
  testValue("autoSave", "autosave");
  testValue("axis", "axis");
  testValue("background", "background");
  testValue("bgColor", "bgcolor");
  testValue("border", "border");
  testValue("borderColor", "bordercolor");
  testValue("bottomMargin", "bottommargin");
  testValue("capture", "capture");
  testValue("cellPadding", "cellpadding");
  testValue("cellSpacing", "cellspacing");
  testValue("char", "char");
  testValue("charOff", "charoff");
  testValue("charSet", "charset");
  testValue("checked", "checked");
  testValue("cite", "cite");
  testValue("classId", "classid");
  testValue("clear", "clear");
  testValue("code", "code");
  testValue("codeBase", "codebase");
  testValue("codeType", "codetype");
  testValue("colSpan", "colspan");
  testValue("color", "color");
  testValue("cols", "cols");
  testValue("compact", "compact");
  testValue("content", "content");
  testValue("contentEditable", "contenteditable");
  testValue("controls", "controls");
  testValue("controlsList", "controlslist");
  testValue("coords", "coords");
  testValue("crossOrigin", "crossorigin");
  testValue("data", "data");
  testValue("dateTime", "datetime");
  testValue("declare", "declare");
  testValue("decoding", "decoding");
  testValue("default", "default");
  testValue("defer", "defer");
  testValue("dir", "dir");
  testValue("dirName", "dirname");
  testValue("disablePictureInPicture", "disablepictureinpicture");
  testValue("disableRemotePlayback", "disableremoteplayback");
  testValue("disabled", "disabled");
  testValue("download", "download");
  testValue("draggable", "draggable");
  testValue("encType", "enctype");
  testValue("enterKeyHint", "enterkeyhint");
  testValue("event", "event");
  testValue("face", "face");
  testValue("form", "form");
  testValue("formAction", "formaction");
  testValue("formEncType", "formenctype");
  testValue("formMethod", "formmethod");
  testValue("formNoValidate", "formnovalidate");
  testValue("formTarget", "formtarget");
  testValue("frame", "frame");
  testValue("frameBorder", "frameborder");
  testValue("hSpace", "hspace");
  testValue("headers", "headers");
  testValue("height", "height");
  testValue("hidden", "hidden");
  testValue("high", "high");
  testValue("href", "href");
  testValue("hrefLang", "hreflang");
  testValue("htmlFor", "for");
  testValue("httpEquiv", "http-equiv");
  testValue("id", "id");
  testValue("imageSizes", "imagesizes");
  testValue("imageSrcSet", "imagesrcset");
  testValue("inputMode", "inputmode");
  testValue("integrity", "integrity");
  testValue("is", "is");
  testValue("isMap", "ismap");
  testValue("itemId", "itemid");
  testValue("itemProp", "itemprop");
  testValue("itemRef", "itemref");
  testValue("itemScope", "itemscope");
  testValue("itemType", "itemtype");
  testValue("kind", "kind");
  testValue("label", "label");
  testValue("lang", "lang");
  testValue("language", "language");
  testValue("leftMargin", "leftmargin");
  testValue("link", "link");
  testValue("list", "list");
  testValue("loading", "loading");
  testValue("longDesc", "longdesc");
  testValue("loop", "loop");
  testValue("low", "low");
  testValue("lowSrc", "lowsrc");
  testValue("manifest", "manifest");
  testValue("marginHeight", "marginheight");
  testValue("marginWidth", "marginwidth");
  testValue("max", "max");
  testValue("maxLength", "maxlength");
  testValue("media", "media");
  testValue("method", "method");
  testValue("min", "min");
  testValue("minLength", "minlength");
  testValue("multiple", "multiple");
  testValue("muted", "muted");
  testValue("name", "name");
  testValue("noHref", "nohref");
  testValue("noModule", "nomodule");
  testValue("noResize", "noresize");
  testValue("noShade", "noshade");
  testValue("noValidate", "novalidate");
  testValue("noWrap", "nowrap");
  testValue("nonce", "nonce");
  testValue("object", "object");
  testValue("open", "open");
  testValue("optimum", "optimum");
  testValue("pattern", "pattern");
  testValue("ping", "ping");
  testValue("placeholder", "placeholder");
  testValue("playsInline", "playsinline");
  testValue("poster", "poster");
  testValue("prefix", "prefix");
  testValue("preload", "preload");
  testValue("profile", "profile");
  testValue("prompt", "prompt");
  testValue("property", "property");
  testValue("readOnly", "readonly");
  testValue("referrerPolicy", "referrerpolicy");
  testValue("rel", "rel");
  testValue("required", "required");
  testValue("results", "results");
  testValue("rev", "rev");
  testValue("reversed", "reversed");
  testValue("rightMargin", "rightmargin");
  testValue("role", "role");
  testValue("rowSpan", "rowspan");
  testValue("rows", "rows");
  testValue("rules", "rules");
  testValue("sandbox", "sandbox");
  testValue("scheme", "scheme");
  testValue("scope", "scope");
  testValue("scoped", "scoped");
  testValue("scrolling", "scrolling");
  testValue("seamless", "seamless");
  testValue("security", "security");
  testValue("selected", "selected");
  testValue("shape", "shape");
  testValue("size", "size");
  testValue("sizes", "sizes");
  testValue("slot", "slot");
  testValue("span", "span");
  testValue("spellCheck", "spellcheck");
  testValue("src", "src");
  testValue("srcDoc", "srcdoc");
  testValue("srcLang", "srclang");
  testValue("srcSet", "srcset");
  testValue("standby", "standby");
  testValue("start", "start");
  testValue("step", "step");
  testValue("style", "style");
  testValue("summary", "summary");
  testValue("tabIndex", "tabindex");
  testValue("target", "target");
  testValue("text", "text");
  testValue("title", "title");
  testValue("topMargin", "topmargin");
  testValue("translate", "translate");
  testValue("type", "type");
  testValue("typeMustMatch", "typemustmatch");
  testValue("unselectable", "unselectable");
  testValue("useMap", "usemap");
  testValue("vAlign", "valign");
  testValue("vLink", "vlink");
  testValue("vSpace", "vspace");
  testValue("value", "value");
  testValue("valueType", "valuetype");
  testValue("version", "version");
  testValue("width", "width");
  testValue("wrap", "wrap");
});

describe("nestedRoots", () => {
  beforeEach(() => {
    _resetTemplateCounter();

    document.body.innerHTML = "<div id='app'></div>";
  });

  it("nestedRoots 01", () => {
    const container = document.getElementById("app");

    const order = [];
    render(
      html` <div id="parent" onclick=${() => order.push("parent")}></div> `,
      container,
    );

    const parent = document.getElementById("parent");
    render(
      html`<div id="target" onclick=${() => order.push("child")}></div>`,
      parent,
    );

    const target = document.getElementById("target");
    target.dispatchEvent(new Event("click", { bubbles: true }));

    expect(order).toEqual(["child", "parent"]);
  });

  it("nestedRoots 02", () => {
    const container = document.getElementById("app");

    const order = [];
    render(
      html` <div id="parent" onclick=${() => order.push("parent")}></div> `,
      container,
    );

    const parent = document.getElementById("parent");
    parent.innerHTML = "<div id='middle'></div>";

    const middle = document.getElementById("middle");
    render(
      html`<div id="target" onclick=${() => order.push("child")}></div>`,
      middle,
    );

    const target = document.getElementById("target");
    target.dispatchEvent(new Event("click", { bubbles: true }));

    expect(order).toEqual(["child", "parent"]);
  });
});

describe("webcomponents", () => {
  beforeEach(() => {
    _resetTemplateCounter();

    document.body.innerHTML = "<div id='app'></div>";
  });

  it("webcomponents 01", () => {
    const container = document.getElementById("app");

    class XSearch extends HTMLElement {
      connectedCallback() {
        const shadowRoot = this.attachShadow({ mode: "open" });

        const name = this.getAttribute("name");
        render(html`<div>Web Component ${name}</div>`, shadowRoot);

        expect(shadowRoot.firstChild).toMatchSnapshot();
      }
    }
    customElements.define("x-search-1", XSearch);

    render(
      html`
        <div>
          Hello
          <x-search-1 name=${"World"}></x-search-1>
          !
        </div>
      `,
      container,
    );

    expect(container).toMatchSnapshot();
  });

  it("webcomponents 02", () => {
    const container = document.getElementById("app");

    let target;
    const order = [];

    class XSearch extends HTMLElement {
      connectedCallback() {
        const shadowRoot = this.attachShadow({ mode: "open" });

        const name = this.getAttribute("name");
        render(
          html`<div onclick=${() => order.push("target")} id="target">
            Web Component ${name}
          </div>`,
          shadowRoot,
        );

        target = shadowRoot.getElementById("target");

        expect(shadowRoot.firstChild).toMatchSnapshot();
      }
    }
    customElements.define("x-search-2", XSearch);

    render(
      html`
        <div onclick=${() => order.push("parent")}>
          Hello
          <x-search-2 name=${"World"}></x-search-2>
          !
        </div>
      `,
      container,
    );
    expect(container).toMatchSnapshot();

    target.dispatchEvent(new Event("click", { bubbles: true, composed: true }));

    expect(order).toEqual(["target", "parent"]);
  });

  it("webcomponents 03", () => {
    const container = document.getElementById("app");

    let target;
    const order = [];

    class XSearch extends HTMLElement {
      connectedCallback() {
        const shadowRoot = this.attachShadow({ mode: "closed" });

        const name = this.getAttribute("name");
        render(
          html`<div onclick=${() => order.push("target")} id="target">
            Web Component ${name}
          </div>`,
          shadowRoot,
        );

        target = shadowRoot.getElementById("target");

        expect(shadowRoot.firstChild).toMatchSnapshot();
      }
    }
    customElements.define("x-search-3", XSearch);

    render(
      html`
        <div onclick=${() => order.push("parent")}>
          Hello
          <x-search-3 name=${"World"}></x-search-3>
          !
        </div>
      `,
      container,
    );
    expect(container).toMatchSnapshot();

    target.dispatchEvent(new Event("click", { bubbles: true, composed: true }));

    expect(order).toEqual(["target", "parent"]);
  });

  it("webcomponents 04", () => {
    const container = document.getElementById("app");

    let target;
    const order = [];

    class XSearch extends HTMLElement {
      connectedCallback() {
        const shadowRoot = this.attachShadow({ mode: "open" });

        const name = this.getAttribute("name");
        render(
          html`<div onclick=${() => order.push("target")} id="target">
            Web Component ${name}
          </div>`,
          shadowRoot,
        );

        target = shadowRoot.getElementById("target");

        expect(shadowRoot.firstChild).toMatchSnapshot();
      }
    }
    customElements.define("x-search-4", XSearch);

    render(
      html`
        <div id="parent" onclick=${() => order.push("parent")}>
          Hello
          <x-search-4
            name=${"World"}
            onclick=${() => order.push("custom-element")}
          ></x-search-4>
          !
        </div>
      `,
      container,
    );
    expect(container).toMatchSnapshot();

    target.dispatchEvent(new Event("click", { bubbles: true, composed: true }));

    expect(order).toEqual(["target", "custom-element", "parent"]);
  });

  it("webcomponents 05", () => {
    const container = document.getElementById("app");

    const order = [];

    class XSearch extends HTMLElement {
      connectedCallback() {
        const shadowRoot = this.attachShadow({ mode: "open" });

        const name = this.getAttribute("name");
        render(html`<div>Web Component ${name}</div>`, shadowRoot);

        expect(shadowRoot.firstChild).toMatchSnapshot();
      }
    }
    customElements.define("x-search-5", XSearch);

    render(
      html`
        <div onclick=${() => order.push("parent")}>
          Hello
          <x-search-5
            name=${"World"}
            onclick=${() => order.push("custom-element")}
          ></x-search-5>
          !
        </div>
      `,
      container,
    );
    expect(container).toMatchSnapshot();

    const target = container.firstChild.firstChild.nextSibling;
    expect(target.tagName).toBe("X-SEARCH-5");

    target.dispatchEvent(
      new Event("click", { bubbles: false, composed: true }),
    );

    expect(order).toEqual(["custom-element"]);
  });

  it("webcomponents 06", () => {
    const container = document.getElementById("app");

    let target;
    const order = [];

    class XSearch extends HTMLElement {
      connectedCallback() {
        const shadowRoot = this.attachShadow({ mode: "open" });

        const name = this.getAttribute("name");
        render(
          html`<div id="target" onclick=${() => order.push("target")}>
            Web Component ${name}
          </div>`,
          shadowRoot,
        );

        target = shadowRoot.getElementById("target");

        expect(shadowRoot.firstChild).toMatchSnapshot();
      }
    }
    customElements.define("x-search-6", XSearch);

    render(
      html`
        <div onclick=${() => order.push("parent")}>
          Hello
          <x-search-6
            name=${"World"}
            onclick=${() => order.push("custom-element")}
          ></x-search-6>
          !
        </div>
      `,
      container,
    );
    expect(container).toMatchSnapshot();

    target.dispatchEvent(new Event("click"));

    expect(order).toEqual(["target"]);
  });

  it("webcomponents 07", () => {
    const container = document.getElementById("app");

    let target;
    const order = [];

    class XSearch extends HTMLElement {
      connectedCallback() {
        const shadowRoot = this.attachShadow({ mode: "open" });

        const name = this.getAttribute("name");
        render(
          html`<div id="target" onclick=${() => order.push("target")}>
            Web Component ${name}
          </div>`,
          shadowRoot,
        );

        target = shadowRoot.getElementById("target");

        expect(shadowRoot.firstChild).toMatchSnapshot();
      }
    }
    customElements.define("x-search-7", XSearch);

    render(
      html`
        <div onclick=${() => order.push("parent")}>
          Hello
          <x-search-7
            name=${"World"}
            onclick=${() => order.push("custom-element")}
          ></x-search-7>
          !
        </div>
      `,
      container,
    );
    expect(container).toMatchSnapshot();

    target.dispatchEvent(
      new Event("click", { bubbles: true, composed: false }),
    );

    expect(order).toEqual(["target"]);
  });

  it("webcomponents 08", () => {
    const container = document.getElementById("app");

    let target;
    const order = [];

    class XSearch extends HTMLElement {
      connectedCallback() {
        const shadowRoot = this.attachShadow({ mode: "open" });

        const name = this.getAttribute("name");
        shadowRoot.innerHTML = `<div id='target'>Web Component ${name}</div>`;

        target = shadowRoot.getElementById("target");

        expect(shadowRoot.firstChild).toMatchSnapshot();
      }
    }
    customElements.define("x-search-8", XSearch);

    render(
      html`
        <div onclick=${() => order.push("parent")}>
          Hello
          <x-search-8
            name=${"World"}
            onclick=${() => order.push("custom-element")}
          ></x-search-8>
          !
        </div>
      `,
      container,
    );
    expect(container).toMatchSnapshot();

    target.dispatchEvent(
      new Event("click", { bubbles: false, composed: false }),
    );

    expect(order).toEqual([]);
  });

  it("webcomponents 09", () => {
    const container = document.getElementById("app");

    let target, searchRoot;
    const order = [];

    class XSearch extends HTMLElement {
      connectedCallback() {
        const shadowRoot = this.attachShadow({ mode: "open" });

        const name = this.getAttribute("name");
        shadowRoot.innerHTML = `<div id='search-root'><div id='target'>Web Component ${name}</div></div>`;

        target = shadowRoot.getElementById("target");
        searchRoot = shadowRoot.getElementById("search-root");

        expect(shadowRoot.firstChild).toMatchSnapshot();
      }
    }
    customElements.define("x-search-9", XSearch);

    render(
      html`
        <div onclick=${() => order.push("parent")}>
          Hello
          <x-search-9
            name=${"World"}
            onclick=${() => order.push("custom-element")}
          ></x-search-9>
          !
        </div>
      `,
      container,
    );
    expect(container).toMatchSnapshot();

    searchRoot.addEventListener("click", e => {
      e.stopPropagation();
    });

    target.dispatchEvent(new Event("click", { bubbles: true, composed: true }));

    expect(order).toEqual([]);
  });

  it("webcomponents 10", () => {
    const container = document.getElementById("app");

    let target;
    const order = [];

    class XSearch extends HTMLElement {
      connectedCallback() {
        const shadowRoot = this.attachShadow({ mode: "open" });

        const name = this.getAttribute("name");
        render(
          html`<div id="target" onclick=${() => order.push("target")}>
            Web Component ${name}
          </div>`,
          shadowRoot,
        );
        target = shadowRoot.getElementById("target");

        expect(shadowRoot.firstChild).toMatchSnapshot();
      }
    }
    customElements.define("x-search-10", XSearch);

    render(
      html`
        <div onclick=${() => order.push("parent")}>
          Hello
          <x-search-10
            name=${"World"}
            onclick=${() => order.push("custom-element")}
          ></x-search-10>
          !
        </div>
      `,
      container,
    );
    expect(container).toMatchSnapshot();

    target.dispatchEvent(
      new Event("click", { bubbles: false, composed: false }),
    );

    expect(order).toEqual(["target"]);
  });

  it("webcomponents 11", () => {
    const container = document.getElementById("app");

    let target;
    const order = [];

    class XSearch extends HTMLElement {
      connectedCallback() {
        const shadowRoot = this.attachShadow({ mode: "open" });

        const name = this.getAttribute("name");
        render(
          html`<div id="target" onclick=${() => order.push("target")}>
            Web Component ${name}
          </div>`,
          shadowRoot,
        );
        target = shadowRoot.getElementById("target");

        expect(shadowRoot.firstChild).toMatchSnapshot();
      }
    }
    customElements.define("x-search-11", XSearch);

    render(
      html`
        <div onclick=${() => order.push("parent")}>
          Hello
          <x-search-11
            name=${"World"}
            onclick=${() => order.push("custom-element")}
          ></x-search-11>
          !
        </div>
      `,
      container,
    );
    expect(container).toMatchSnapshot();

    target.dispatchEvent(
      new Event("click", { bubbles: false, composed: true }),
    );

    /**
     * This may seem counter-intuitive, but it looks like the browser
     * fire event handler on custom-element in target phase
     * for event that has `bubbles: false`, `composed: true`
     * and its target is inside of its Shadow DOM.
     * Thus allowing for event to escape custom element shadow tree
     * but not going further.
     * OR this is a bug in jsdom implementation.
     */
    expect(order).toEqual(["target", "custom-element"]);
  });

  it("webcomponents 12", () => {
    const container = document.getElementById("app");

    const order = [];

    class XSearch extends HTMLElement {
      connectedCallback() {
        const shadowRoot = this.attachShadow({ mode: "open" });

        const name = this.getAttribute("name");
        render(
          html`<div id="target" onclick=${() => order.push("target")}>
            Web Component ${name}
          </div>`,
          shadowRoot,
        );

        expect(shadowRoot.firstChild).toMatchSnapshot();
      }
    }
    customElements.define("x-search-12", XSearch);

    render(
      html`
        <div onclick=${() => order.push("parent")}>
          Hello
          <x-search-12
            name=${"World"}
            onclick=${() => order.push("custom-element")}
          ></x-search-12>
          !
        </div>
      `,
      container,
    );
    expect(container).toMatchSnapshot();

    const target = container.firstChild.firstChild.nextSibling;
    expect(target.tagName).toBe("X-SEARCH-12");

    target.dispatchEvent(
      new Event("click", { bubbles: false, composed: false }),
    );

    expect(order).toEqual(["custom-element"]);
  });

  it("webcomponents 13", () => {
    const container = document.getElementById("app");

    let target;
    const order = [];

    class XSearch extends HTMLElement {
      connectedCallback() {
        const mountPoint = document.createElement("span");
        this.attachShadow({ mode: "open" }).appendChild(mountPoint);

        const name = this.getAttribute("name");
        render(
          html`<div onclick=${() => order.push("target")} id="target">
            Web Component ${name}
          </div>`,
          mountPoint,
        );

        target = mountPoint.firstChild;

        expect(mountPoint).toMatchSnapshot();
      }
    }
    customElements.define("x-search-13", XSearch);

    render(
      html`
        <div id="parent" onclick=${() => order.push("parent")}>
          Hello
          <x-search-13
            name=${"World"}
            onclick=${() => order.push("custom-element")}
          ></x-search-13>
          !
        </div>
      `,
      container,
    );
    expect(container).toMatchSnapshot();

    target.dispatchEvent(new Event("click", { bubbles: true, composed: true }));

    expect(order).toEqual(["target", "custom-element", "parent"]);
  });

  it("webcomponents 14", () => {
    const container = document.getElementById("app");

    const order = [];

    class XSearch extends HTMLElement {
      connectedCallback() {
        const shadowRoot = this.attachShadow({ mode: "open" });

        const name = this.getAttribute("name");
        render(
          html`<div id="target" onclick=${() => order.push("target")}>
            Web Component ${name}
          </div>`,
          shadowRoot,
        );

        expect(shadowRoot.firstChild).toMatchSnapshot();
      }
    }
    customElements.define("x-search-14", XSearch);

    let state = 0;
    render(
      html`
        <div onclick=${() => order.push("parent")}>
          Hello
          <x-search-14
            name=${"World"}
            onclick=${() => order.push(state++)}
          ></x-search-14>
          !
        </div>
      `,
      container,
    );
    expect(container).toMatchSnapshot();

    const target = container.firstChild.firstChild.nextSibling;
    expect(target.tagName).toBe("X-SEARCH-14");

    target.dispatchEvent(
      new Event("click", { bubbles: false, composed: false }),
    );
    target.dispatchEvent(
      new Event("click", { bubbles: false, composed: false }),
    );
    target.dispatchEvent(
      new Event("click", { bubbles: false, composed: false }),
    );

    expect(order).toEqual([0, 1, 2]);
  });

  it("webcomponents 15", () => {
    const container = document.getElementById("app");

    const order = [];

    class XSearch extends HTMLElement {
      connectedCallback() {
        const shadowRoot = this.attachShadow({ mode: "open" });

        const name = this.getAttribute("name");
        render(
          html`<div id="target" onclick=${() => order.push("target")}>
            Web Component ${name}
          </div>`,
          shadowRoot,
        );

        expect(shadowRoot.firstChild).toMatchSnapshot();
      }
    }
    customElements.define("x-search-15", XSearch);

    render(
      html`
        <div onclick=${() => order.push("parent")}>
          Hello
          <x-search-15 name=${"World"} onclick=${undefined}></x-search-15>
          !
        </div>
      `,
      container,
    );
    expect(container).toMatchSnapshot();

    const target = container.firstChild.firstChild.nextSibling;
    expect(target.tagName).toBe("X-SEARCH-15");

    target.dispatchEvent(
      new Event("click", { bubbles: false, composed: false }),
    );

    expect(order).toEqual([]);
  });

  describe("slots", () => {
    it("slots 01", () => {
      const container = document.getElementById("app");

      const order = [];

      class XSearch extends HTMLElement {
        connectedCallback() {
          const shadowRoot = this.attachShadow({ mode: "closed" });

          shadowRoot.innerHTML = `<div id='content'><slot></slot></div>`;

          const content = shadowRoot.getElementById("content");
          content.addEventListener("click", () => {
            order.push("custom-element-content");
          });
        }
      }
      customElements.define("x-search-slots-01", XSearch);

      render(
        html`
          <div onclick=${() => order.push("parent")}>
            Hello
            <x-search-slots-01>
              <div id="target" onclick=${() => order.push("target")}></div>
            </x-search-slots-01>
            !
          </div>
        `,
        container,
      );
      expect(container).toMatchSnapshot();

      const target = document.getElementById("target");

      target.dispatchEvent(
        new Event("click", { bubbles: true, composed: true }),
      );

      expect(order).toEqual(["target", "custom-element-content", "parent"]);
    });

    it("slots 02", () => {
      const container = document.getElementById("app");

      const order = [];

      class XSearch extends HTMLElement {
        connectedCallback() {
          const shadowRoot = this.attachShadow({ mode: "closed" });

          shadowRoot.innerHTML = `<div id='content'><slot></slot></div>`;

          const content = shadowRoot.getElementById("content");
          content.addEventListener("click", () => {
            order.push("custom-element-content");
          });
        }
      }
      customElements.define("x-search-slots-02", XSearch);

      const Target = component(() => () => {
        return html`
          <div id="target" onclick=${() => order.push("target")}></div>
        `;
      });

      render(
        html`
          <div onclick=${() => order.push("parent")}>
            Hello
            <x-search-slots-02>${Target()}</x-search-slots-02>
            !
          </div>
        `,
        container,
      );
      expect(container).toMatchSnapshot();

      const target = document.getElementById("target");

      target.dispatchEvent(
        new Event("click", { bubbles: true, composed: true }),
      );

      expect(order).toEqual(["target", "custom-element-content", "parent"]);
    });

    it("slots 03", () => {
      const container = document.getElementById("app");

      const order = [];

      class XSearch extends HTMLElement {
        connectedCallback() {
          const shadowRoot = this.attachShadow({ mode: "closed" });

          shadowRoot.innerHTML = `<div id='content'><slot></slot></div>`;

          const content = shadowRoot.getElementById("content");
          content.addEventListener("click", () => {
            order.push("custom-element-content");
          });
        }
      }
      customElements.define("x-search-slots-03", XSearch);

      render(
        html`
          <div onclick=${() => order.push("parent")}>
            Hello
            <x-search-slots-03>
              <div>
                <div id="target" onclick=${() => order.push("target")}></div>
              </div>
            </x-search-slots-03>
            !
          </div>
        `,
        container,
      );
      expect(container).toMatchSnapshot();

      const target = document.getElementById("target");

      target.dispatchEvent(
        new Event("click", { bubbles: true, composed: true }),
      );

      expect(order).toEqual(["target", "custom-element-content", "parent"]);
    });

    it("slots 04", () => {
      const container = document.getElementById("app");

      const order = [];

      class XSearch extends HTMLElement {
        connectedCallback() {
          const shadowRoot = this.attachShadow({ mode: "closed" });

          render(
            html`
              <div
                id="content"
                onclick=${() => {
                  order.push("custom-element-content");
                }}
              >
                <slot></slot>
              </div>
            `,
            shadowRoot,
          );
        }
      }
      customElements.define("x-search-slots-04", XSearch);

      render(
        html`
          <div onclick=${() => order.push("parent")}>
            Hello
            <x-search-slots-04>
              <div>
                <div id="target" onclick=${() => order.push("target")}></div>
              </div>
            </x-search-slots-04>
            !
          </div>
        `,
        container,
      );
      expect(container).toMatchSnapshot();

      const target = document.getElementById("target");

      target.dispatchEvent(
        new Event("click", { bubbles: true, composed: true }),
      );

      expect(order).toEqual(["target", "custom-element-content", "parent"]);
    });

    it("slots 05", () => {
      const container = document.getElementById("app");

      const order = [];

      class XSearch extends HTMLElement {
        connectedCallback() {
          const shadowRoot = this.attachShadow({ mode: "closed" });

          render(
            html`
              <div
                id="content"
                onclick=${() => {
                  order.push("custom-element-content");
                }}
              >
                <slot></slot>
              </div>
            `,
            shadowRoot,
          );
        }
      }
      customElements.define("x-search-slots-05", XSearch);

      render(
        html`
          <div onclick=${() => order.push("parent")}>
            Hello
            <x-search-slots-05 onclick=${() => order.push("custom-element")}>
              <div>
                <div id="target" onclick=${() => order.push("target")}></div>
              </div>
            </x-search-slots-05>
            !
          </div>
        `,
        container,
      );
      expect(container).toMatchSnapshot();

      const target = document.getElementById("target");

      target.dispatchEvent(
        new Event("click", { bubbles: true, composed: true }),
      );

      expect(order).toEqual([
        "target",
        "custom-element-content",
        "custom-element",
        "parent",
      ]);
    });

    it("slots 06", () => {
      const container = document.getElementById("app");

      const order = [];

      class XSearch extends HTMLElement {
        connectedCallback() {
          const shadowRoot = this.attachShadow({ mode: "closed" });

          render(
            html`
              <div
                id="content"
                onclick=${() => {
                  order.push("custom-element-content");
                }}
              >
                <slot></slot>
              </div>
            `,
            shadowRoot,
          );
        }
      }
      customElements.define("x-search-slots-06", XSearch);

      render(
        html`
          <div onclick=${() => order.push("parent")}>
            Hello
            <x-search-slots-06 onclick=${() => order.push("custom-element")}>
              <div>
                <div id="target" onclick=${() => order.push("target")}></div>
              </div>
            </x-search-slots-06>
            !
          </div>
        `,
        container,
      );
      expect(container).toMatchSnapshot();

      const target = document.getElementById("target");

      target.dispatchEvent(
        new Event("click", { bubbles: false, composed: false }),
      );

      expect(order).toEqual(["target"]);
    });

    it("slots 07", () => {
      const container = document.getElementById("app");

      const order = [];

      class XSearch extends HTMLElement {
        connectedCallback() {
          const shadowRoot = this.attachShadow({ mode: "closed" });

          render(
            html`
              <div
                id="content"
                onclick=${() => {
                  order.push("custom-element-content");
                }}
              >
                <slot></slot>
              </div>
            `,
            shadowRoot,
          );
        }
      }
      customElements.define("x-search-slots-07", XSearch);

      render(
        html`
          <div onclick=${() => order.push("parent")}>
            Hello
            <x-search-slots-07 onclick=${() => order.push("custom-element")}>
              <div>
                <div id="target" onclick=${() => order.push("target")}></div>
              </div>
            </x-search-slots-07>
            !
          </div>
        `,
        container,
      );
      expect(container).toMatchSnapshot();

      const target = document.getElementById("target");

      target.dispatchEvent(
        new Event("click", { bubbles: false, composed: true }),
      );

      expect(order).toEqual(["target"]);
    });

    it("slots 08", () => {
      const container = document.getElementById("app");

      const order = [];

      class XSearch extends HTMLElement {
        connectedCallback() {
          const shadowRoot = this.attachShadow({ mode: "closed" });

          render(
            html`
              <div
                id="content"
                onclick=${() => {
                  order.push("custom-element-content");
                }}
              >
                <slot></slot>
              </div>
            `,
            shadowRoot,
          );

          const content = shadowRoot.getElementById("content");
          content.addEventListener(
            "click",
            e => {
              e.stopPropagation();
            },
            { capture: true },
          );
        }
      }
      customElements.define("x-search-slots-08", XSearch);

      render(
        html`
          <div onclick=${() => order.push("parent")}>
            Hello
            <x-search-slots-08 onclick=${() => order.push("custom-element")}>
              <div>
                <div id="target" onclick=${() => order.push("target")}></div>
              </div>
            </x-search-slots-08>
            !
          </div>
        `,
        container,
      );
      expect(container).toMatchSnapshot();

      const target = document.getElementById("target");

      target.dispatchEvent(
        new Event("click", { bubbles: false, composed: true }),
      );

      expect(order).toEqual([]);
    });

    it("slots 09", () => {
      const container = document.getElementById("app");

      const order = [];

      class XSearch extends HTMLElement {
        connectedCallback() {
          const shadowRoot = this.attachShadow({ mode: "closed" });

          render(
            html`
              <div
                id="content"
                onclick=${() => {
                  order.push("custom-element-content");
                }}
              >
                <slot></slot>
              </div>
            `,
            shadowRoot,
          );
        }
      }
      customElements.define("x-search-slots-09", XSearch);

      render(
        html`
          <div onclick=${() => order.push("parent")}>
            Hello
            <x-search-slots-09>
              <div>
                <div id="target" onclick=${() => order.push("target")}></div>
              </div>
            </x-search-slots-09>
            !
          </div>
        `,
        container,
      );
      expect(container).toMatchSnapshot();

      const target = document.getElementById("target");

      target.dispatchEvent(
        new Event("click", { bubbles: true, composed: false }),
      );

      expect(order).toEqual(["target", "custom-element-content", "parent"]);
    });

    it("slots 10", () => {
      const container = document.getElementById("app");

      const order = [];

      class XSearch extends HTMLElement {
        connectedCallback() {
          const shadowRoot = this.attachShadow({ mode: "closed" });

          render(
            html`
              <div
                id="content"
                onclick=${() => {
                  order.push("custom-element-content");
                }}
              >
                <slot></slot>
              </div>
            `,
            shadowRoot,
          );
        }
      }
      customElements.define("x-search-slots-10", XSearch);

      const Target = component(() => () => {
        return html`
          <x-search-slots-10>
            <div>
              <div id="target" onclick=${() => order.push("target")}></div>
            </div>
          </x-search-slots-10>
        `;
      });

      const App = component(() => () => {
        return html`
          <div onclick=${() => order.push("parent")}>Hello ${Target()} !</div>
        `;
      });

      render(App(), container);
      expect(container).toMatchSnapshot();

      const target = document.getElementById("target");

      target.dispatchEvent(
        new Event("click", { bubbles: true, composed: true }),
      );

      expect(order).toEqual(["target", "custom-element-content", "parent"]);
    });

    it("slots 11", () => {
      const container = document.getElementById("app");

      const order = [];

      class XSearch extends HTMLElement {
        connectedCallback() {
          const shadowRoot = this.attachShadow({ mode: "closed" });

          shadowRoot.innerHTML = `<div id='content'><slot></slot></div>`;

          const content = shadowRoot.getElementById("content");
          content.addEventListener("click", () => {
            order.push("custom-element-content");
          });
        }
      }
      customElements.define("x-search-slots-11", XSearch);

      const Target = component(() => () => {
        return html`
          <div id="target" onclick=${() => order.push("target")}></div>
        `;
      });

      render(
        html`
          <div onclick=${() => order.push("parent")}>
            Hello
            <x-search-slots-11>
              <div>${Target()}</div>
            </x-search-slots-11>
            !
          </div>
        `,
        container,
      );
      expect(container).toMatchSnapshot();

      const target = document.getElementById("target");

      target.dispatchEvent(
        new Event("click", { bubbles: true, composed: true }),
      );

      expect(order).toEqual(["target", "custom-element-content", "parent"]);
    });

    it("slots 12", () => {
      const container = document.getElementById("app");

      let order = [];

      class XSearch extends HTMLElement {
        connectedCallback() {
          const shadowRoot = this.attachShadow({ mode: "closed" });

          shadowRoot.innerHTML = `<div id='content'><slot></slot></div>`;

          const content = shadowRoot.getElementById("content");
          content.addEventListener("click", () => {
            order.push("custom-element-content");
          });
        }
      }
      customElements.define("x-search-slots-12", XSearch);

      const Target = component(() => id => {
        return html` <div id=${id} onclick=${() => order.push(id)}></div> `;
      });

      render(
        html`
          <div onclick=${() => order.push("parent")}>
            Hello
            <x-search-slots-12>
              <div>
                <div>${Target("target1")}</div>
                <div>${Target("target2")}</div>
              </div>
            </x-search-slots-12>
            !
          </div>
        `,
        container,
      );
      expect(container).toMatchSnapshot();

      const target1 = document.getElementById("target1");

      target1.dispatchEvent(
        new Event("click", { bubbles: true, composed: true }),
      );

      expect(order).toEqual(["target1", "custom-element-content", "parent"]);

      order = [];

      const target2 = document.getElementById("target2");

      target2.dispatchEvent(
        new Event("click", { bubbles: true, composed: true }),
      );

      expect(order).toEqual(["target2", "custom-element-content", "parent"]);
    });

    it("slots 13", () => {
      const container = document.getElementById("app");

      const order = [];

      class XSearch extends HTMLElement {
        connectedCallback() {
          const shadowRoot = this.attachShadow({ mode: "closed" });

          shadowRoot.innerHTML = `<div id='content'><slot></slot></div>`;

          const content = shadowRoot.getElementById("content");
          content.addEventListener("click", () => {
            order.push("custom-element-content");
          });
        }
      }
      customElements.define("x-search-slots-13", XSearch);

      const Target = component(() => () => {
        return html`
          <div id="target" onclick=${() => order.push("target")}></div>
        `;
      });

      render(
        html`
          <div onclick=${() => order.push("parent")}>
            Hello
            <x-search-slots-13 onclick=${() => order.push("custom-element")}>
              <div>${Target()}</div>
            </x-search-slots-13>
            !
          </div>
        `,
        container,
      );
      expect(container).toMatchSnapshot();

      const target = document.getElementById("target");

      target.dispatchEvent(
        new Event("click", { bubbles: true, composed: true }),
      );

      expect(order).toEqual([
        "target",
        "custom-element-content",
        "custom-element",
        "parent",
      ]);
    });

    it("slots 14", () => {
      const container = document.getElementById("app");

      const order = [];

      class XSearch extends HTMLElement {
        connectedCallback() {
          const shadowRoot = this.attachShadow({ mode: "closed" });

          render(
            html`
              <div
                id="content"
                onclick=${() => order.push("custom-element-content")}
              >
                <slot></slot>
              </div>
            `,
            shadowRoot,
          );
        }
      }
      customElements.define("x-search-slots-14", XSearch);

      const Target = component(() => () => {
        return html`
          <div id="target" onclick=${() => order.push("target")}></div>
        `;
      });

      render(
        html`
          <div onclick=${() => order.push("parent")}>
            Hello
            <x-search-slots-14 onclick=${() => order.push("custom-element")}>
              <div>${Target()}</div>
            </x-search-slots-14>
            !
          </div>
        `,
        container,
      );
      expect(container).toMatchSnapshot();

      const target = document.getElementById("target");

      target.dispatchEvent(
        new Event("click", { bubbles: true, composed: true }),
      );

      expect(order).toEqual([
        "target",
        "custom-element-content",
        "custom-element",
        "parent",
      ]);
    });

    it("slots 15", () => {
      const container = document.getElementById("app");

      const order = [];

      class XSearch extends HTMLElement {
        connectedCallback() {
          const shadowRoot = this.attachShadow({ mode: "closed" });

          render(
            html`
              <div
                id="content"
                onclick=${() => order.push("custom-element-content")}
              >
                <slot></slot>
              </div>
            `,
            shadowRoot,
          );
        }
      }
      customElements.define("x-search-slots-15", XSearch);

      const Target = component(() => () => {
        return html`
          <div id="target" onclick=${() => order.push("target")}></div>
        `;
      });

      render(
        html`
          <div onclick=${() => order.push("parent")}>
            Hello
            <x-search-slots-15 onclick=${() => order.push("custom-element")}>
              <div>
                ${Target()}
                <div onclick=${() => order.push("side")}></div>
              </div>
            </x-search-slots-15>
            !
          </div>
        `,
        container,
      );
      expect(container).toMatchSnapshot();

      const target = document.getElementById("target");

      target.dispatchEvent(
        new Event("click", { bubbles: true, composed: true }),
      );

      expect(order).toEqual([
        "target",
        "custom-element-content",
        "custom-element",
        "parent",
      ]);
    });

    it("slots 16", () => {
      const container = document.getElementById("app");

      const order = [];

      class XSearch extends HTMLElement {
        connectedCallback() {
          const shadowRoot = this.attachShadow({ mode: "closed" });

          render(
            html`
              <div
                id="content"
                onclick=${() => order.push("custom-element-content")}
              >
                <slot></slot>
              </div>
            `,
            shadowRoot,
          );
        }
      }
      customElements.define("x-search-slots-16", XSearch);

      const Target = component(() => () => {
        return html`
          <div id="target" onclick=${() => order.push("target")}></div>
        `;
      });

      render(
        html`
          <div onclick=${() => order.push("parent")}>
            Hello
            <x-search-slots-16 onclick=${() => order.push("custom-element")}>
              <div>
                <div onclick=${() => order.push("side")}></div>
                ${Target()}
              </div>
            </x-search-slots-16>
            !
          </div>
        `,
        container,
      );
      expect(container).toMatchSnapshot();

      const target = document.getElementById("target");

      target.dispatchEvent(
        new Event("click", { bubbles: true, composed: true }),
      );

      expect(order).toEqual([
        "target",
        "custom-element-content",
        "custom-element",
        "parent",
      ]);
    });

    it("slots 17", () => {
      const container = document.getElementById("app");

      let order = [];

      class XSearch extends HTMLElement {
        connectedCallback() {
          const shadowRoot = this.attachShadow({ mode: "closed" });

          shadowRoot.innerHTML = `<div id='content'><slot></slot></div>`;

          const content = shadowRoot.getElementById("content");
          content.addEventListener("click", () => {
            order.push("custom-element-content");
          });
        }
      }
      customElements.define("x-search-slots-17", XSearch);

      const Target = component(() => id => {
        return html`
          <div>
            <div id=${id} onclick=${() => order.push(id)}></div>
          </div>
        `;
      });

      render(
        html`
          <div onclick=${() => order.push("parent")}>
            Hello
            <x-search-slots-17 onclick=${() => order.push("custom-element")}>
              ${[Target("target1"), Target("target2")]}
            </x-search-slots-17>
            !
          </div>
        `,
        container,
      );
      expect(container).toMatchSnapshot();

      const target1 = document.getElementById("target1");

      target1.dispatchEvent(
        new Event("click", { bubbles: true, composed: true }),
      );

      expect(order).toEqual([
        "target1",
        "custom-element-content",
        "custom-element",
        "parent",
      ]);

      order = [];

      const target2 = document.getElementById("target2");

      target2.dispatchEvent(
        new Event("click", { bubbles: true, composed: true }),
      );

      expect(order).toEqual([
        "target2",
        "custom-element-content",
        "custom-element",
        "parent",
      ]);
    });

    it("slots 18", () => {
      const container = document.getElementById("app");

      let order = [];

      class XSearch extends HTMLElement {
        connectedCallback() {
          const shadowRoot = this.attachShadow({ mode: "closed" });

          shadowRoot.innerHTML = `<div id='content'><slot></slot></div>`;

          const content = shadowRoot.getElementById("content");
          content.addEventListener("click", () => {
            order.push("custom-element-content");
          });
        }
      }
      customElements.define("x-search-slots-18", XSearch);

      container.innerHTML = `<x-search-slots-18></x-search-slots-18>`;

      const root = container.firstChild;

      render(
        html`<div id="target" onclick=${() => order.push("target")}></div>`,
        root,
      );

      expect(container).toMatchSnapshot();

      const target = document.getElementById("target");

      target.dispatchEvent(
        new Event("click", { bubbles: true, composed: true }),
      );

      expect(order).toEqual(["target", "custom-element-content"]);
    });

    it("slots 19", () => {
      const container = document.getElementById("app");

      const order = [];

      class XSearch extends HTMLElement {
        connectedCallback() {
          const shadowRoot = this.attachShadow({ mode: "closed" });

          const name = this.getAttribute("name");
          const id = `custom-element-content-${name}`;

          render(
            html`
              <div id=${id} onclick=${() => order.push(id)}>
                <slot></slot>
              </div>
            `,
            shadowRoot,
          );
        }
      }
      customElements.define("x-search-slots-19", XSearch);

      render(
        html`
          <div onclick=${() => order.push("parent")}>
            Hello
            <x-search-slots-19
              name="first"
              onclick=${() => order.push("custom-element-first")}
            >
              <x-search-slots-19
                name="second"
                onclick=${() => order.push("custom-element-second")}
              >
                <x-search-slots-19
                  name="third"
                  onclick=${() => order.push("custom-element-third")}
                >
                  <x-search-slots-19
                    name="fourth"
                    onclick=${() => order.push("custom-element-fourth")}
                  >
                    <div onclick=${() => order.push("slot-target")}>
                      <div
                        id="target"
                        onclick=${() => order.push("target")}
                      ></div>
                    </div>
                  </x-search-slots-19>
                </x-search-slots-19>
              </x-search-slots-19>
            </x-search-slots-19>
            !
          </div>
        `,
        container,
      );
      expect(container).toMatchSnapshot();

      const target = document.getElementById("target");

      target.dispatchEvent(
        new Event("click", { bubbles: true, composed: true }),
      );

      expect(order).toEqual([
        "target",
        "slot-target",
        "custom-element-content-fourth",
        "custom-element-fourth",
        "custom-element-content-third",
        "custom-element-third",
        "custom-element-content-second",
        "custom-element-second",
        "custom-element-content-first",
        "custom-element-first",
        "parent",
      ]);
    });

    it("slots 20", () => {
      const container = document.getElementById("app");

      const order = [];
      let target;

      class XSearch extends HTMLElement {
        connectedCallback() {
          const shadowRoot = this.attachShadow({ mode: "closed" });

          render(
            html`
              <div
                id="content"
                onclick=${() => {
                  order.push("custom-element-content");
                }}
              >
                <slot></slot>
              </div>
            `,
            shadowRoot,
          );

          target = shadowRoot.getElementById("content");
        }
      }
      customElements.define("x-search-slots-20", XSearch);

      render(
        html`
          <div onclick=${() => order.push("parent")}>
            Hello
            <x-search-slots-20 onclick=${() => order.push("custom-element")}>
              <div>
                <div id="target" onclick=${() => order.push("target")}></div>
              </div>
            </x-search-slots-20>
            !
          </div>
        `,
        container,
      );
      expect(container).toMatchSnapshot();

      target.dispatchEvent(
        new Event("click", { bubbles: false, composed: false }),
      );

      expect(order).toEqual(["custom-element-content"]);
    });

    it("slots 21", () => {
      const container = document.getElementById("app");

      const order = [];
      let target;

      class XSearch extends HTMLElement {
        connectedCallback() {
          const shadowRoot = this.attachShadow({ mode: "closed" });

          render(
            html`
              <div
                id="content"
                onclick=${() => {
                  order.push("custom-element-content");
                }}
              >
                <slot></slot>
              </div>
            `,
            shadowRoot,
          );

          target = shadowRoot.getElementById("content");
        }
      }
      customElements.define("x-search-slots-21", XSearch);

      render(
        html`
          <div onclick=${() => order.push("parent")}>
            Hello
            <x-search-slots-21 onclick=${() => order.push("custom-element")}>
              <div>
                <div id="target" onclick=${() => order.push("target")}></div>
              </div>
            </x-search-slots-21>
            !
          </div>
        `,
        container,
      );
      expect(container).toMatchSnapshot();

      target.dispatchEvent(
        new Event("click", { bubbles: false, composed: true }),
      );

      expect(order).toEqual(["custom-element-content", "custom-element"]);
    });

    it("slots 22", () => {
      const container = document.getElementById("app");

      const order = [];

      class XSearchFour extends HTMLElement {
        connectedCallback() {
          const shadowRoot = this.attachShadow({ mode: "closed" });

          const id = `custom-element-content-four`;

          render(
            html`
              <div id=${id} onclick=${() => order.push(id)}>
                <slot></slot>
              </div>
            `,
            shadowRoot,
          );
        }
      }
      customElements.define("x-search-slots-22-four", XSearchFour);

      class XSearchThree extends HTMLElement {
        connectedCallback() {
          const shadowRoot = this.attachShadow({ mode: "closed" });

          const id = `custom-element-content-three`;

          render(
            html`
              <div id=${id} onclick=${() => order.push(id)}>
                <x-search-slots-22-four
                  onclick=${() => order.push("custom-element-four")}
                >
                  <slot></slot>
                </x-search-slots-22-four>
              </div>
            `,
            shadowRoot,
          );
        }
      }
      customElements.define("x-search-slots-22-three", XSearchThree);

      class XSearchTwo extends HTMLElement {
        connectedCallback() {
          const shadowRoot = this.attachShadow({ mode: "closed" });

          const id = `custom-element-content-two`;

          render(
            html`
              <div id=${id} onclick=${() => order.push(id)}>
                <x-search-slots-22-three
                  onclick=${() => order.push("custom-element-three")}
                >
                  <slot></slot>
                </x-search-slots-22-three>
              </div>
            `,
            shadowRoot,
          );
        }
      }
      customElements.define("x-search-slots-22-two", XSearchTwo);

      class XSearchOne extends HTMLElement {
        connectedCallback() {
          const shadowRoot = this.attachShadow({ mode: "closed" });

          const id = `custom-element-content-one`;

          render(
            html`
              <div id=${id} onclick=${() => order.push(id)}>
                <x-search-slots-22-two
                  onclick=${() => order.push("custom-element-two")}
                >
                  <slot></slot>
                </x-search-slots-22-two>
              </div>
            `,
            shadowRoot,
          );
        }
      }
      customElements.define("x-search-slots-22-one", XSearchOne);

      render(
        html`
          <div onclick=${() => order.push("parent")}>
            Hello
            <x-search-slots-22-one
              onclick=${() => order.push("custom-element-one")}
            >
              <div onclick=${() => order.push("slot-target")}>
                <div id="target" onclick=${() => order.push("target")}></div>
              </div>
            </x-search-slots-22-one>
            !
          </div>
        `,
        container,
      );
      expect(container).toMatchSnapshot();

      const target = document.getElementById("target");

      target.dispatchEvent(
        new Event("click", { bubbles: true, composed: true }),
      );

      expect(order).toEqual([
        "target",
        "slot-target",
        "custom-element-content-four",
        "custom-element-four",
        "custom-element-content-three",
        "custom-element-three",
        "custom-element-content-two",
        "custom-element-two",
        "custom-element-content-one",
        "custom-element-one",
        "parent",
      ]);
    });

    it("slots 23", () => {
      const container = document.getElementById("app");

      const order = [];

      class XSearch extends HTMLElement {
        connectedCallback() {
          const shadowRoot = this.attachShadow({ mode: "closed" });

          render(
            html`
              <div
                id="content"
                onclick=${() => order.push("custom-element-content")}
              >
                <slot></slot>
              </div>
            `,
            shadowRoot,
          );
        }
      }
      customElements.define("x-search-slots-23", XSearch);

      const Target = component(() => () => {
        return html`
          <div id="target" onclick=${() => order.push("target")}></div>
        `;
      });

      render(
        html`
          <div onclick=${() => order.push("parent")}>
            Hello
            <x-search-slots-23 onclick=${() => order.push("custom-element")}>
              <div>
                ${[Target()]}
                <div onclick=${() => order.push("side")}></div>
              </div>
            </x-search-slots-23>
            !
          </div>
        `,
        container,
      );
      expect(container).toMatchSnapshot();

      const target = document.getElementById("target");

      target.dispatchEvent(
        new Event("click", { bubbles: true, composed: true }),
      );

      expect(order).toEqual([
        "target",
        "custom-element-content",
        "custom-element",
        "parent",
      ]);
    });

    it("slots 24", () => {
      const container = document.getElementById("app");

      const order = [];

      class XSearch extends HTMLElement {
        connectedCallback() {
          const shadowRoot = this.attachShadow({ mode: "closed" });

          render(
            html`
              <div
                id="content"
                onclick=${() => order.push("custom-element-content")}
              >
                <slot></slot>
              </div>
            `,
            shadowRoot,
          );
        }
      }
      customElements.define("x-search-slots-24", XSearch);

      const Target = component(() => () => {
        return html`
          <div id="target" onclick=${() => order.push("target")}></div>
        `;
      });

      render(
        html`
          <div onclick=${() => order.push("parent")}>
            Hello
            <x-search-slots-24 onclick=${() => order.push("custom-element")}>
              <div>
                ${[Target(), null]}
                <div onclick=${() => order.push("side")}></div>
              </div>
            </x-search-slots-24>
            !
          </div>
        `,
        container,
      );
      expect(container).toMatchSnapshot();

      const target = document.getElementById("target");

      target.dispatchEvent(
        new Event("click", { bubbles: true, composed: true }),
      );

      expect(order).toEqual([
        "target",
        "custom-element-content",
        "custom-element",
        "parent",
      ]);
    });
  });
});
