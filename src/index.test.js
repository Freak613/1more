import { html, _resetTemplateCounter } from "./index";

describe("compiler", () => {
  afterEach(() => {
    _resetTemplateCounter();
  });

  describe("basic", () => {
    it("basic 1", () => {
      expect(html`<div></div>`.p).toMatchSnapshot();
    });

    it("basic 2", () => {
      expect(
        html`
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
        `.p,
      ).toMatchSnapshot();
    });

    it("basic 3", () => {
      expect(
        html`
          <div>
            <span>Space should be preserved when on single line </span>
            <div></div>
          </div>
        `.p,
      ).toMatchSnapshot();
    });

    it("basic 4", () => {
      expect(
        // prettier-ignore
        html`
          <div>
            <span>
              Spacing should be removed when on separate line
            </span>
            <div></div>
          </div>
        `.p,
      ).toMatchSnapshot();
    });

    it("basic 5", () => {
      expect(
        html`
          <button id="test1" class=${"value2"} disabled>
            class=value2 disabled
          </button>
        `.p,
      ).toMatchSnapshot();
    });

    it("basic 6", () => {
      expect(
        html`
          <button id="test1" disabled class=${"value2"}>
            class=value2 disabled
          </button>
        `.p,
      ).toMatchSnapshot();
    });

    it("basic 7", () => {
      expect(
        html`<input id="test1" class=${"value2"} disabled />`.p,
      ).toMatchSnapshot();
    });
  });

  describe("afterNode", () => {
    it("afterNode 1", () => {
      expect(
        html`
          <div>
            ${1}
            <div></div>
          </div>
        `.p,
      ).toMatchSnapshot();
    });

    it("afterNode 2", () => {
      expect(
        html`
          <div>
            ${1} ${2}
            <div></div>
          </div>
        `.p,
      ).toMatchSnapshot();
    });
  });

  describe("fragments", () => {
    it("fragments 1", () => {
      expect(
        html`
          <div></div>
          <div></div>
        `.p,
      ).toMatchSnapshot();
    });

    it("fragments 2", () => {
      expect(
        html`
          <div>${1}</div>
          <div>${2}</div>
        `.p,
      ).toMatchSnapshot();
    });
  });

  describe("mixed content", () => {
    it("mixed 1", () => {
      expect(html`<div>Hello ${"World"}</div>`.p).toMatchSnapshot();
    });

    it("mixed 2", () => {
      expect(
        html`
          <div>
            Zero ${"First"}
            <input />
            ${"Fourth"} Fifth ${"Sixth"}
          </div>
        `.p,
      ).toMatchSnapshot();
    });

    it("mixed 3", () => {
      expect(
        html`
          <div>
            <div>Zero ${"First"} Second ${"Third"} Fourth</div>
            <div>${"First"} Second ${"Third"} Fourth</div>
            <div>Zero ${"First"} Second ${"Third"} Fourth ${"Fifth"}</div>
            <div>${"First"} Second ${"Third"} Fourth ${"Fifth"}</div>
          </div>
        `.p,
      ).toMatchSnapshot();
    });

    it("mixed 4", () => {
      expect(
        html`
          <div></div>
          <div>
            <div></div>
            <div>Zero ${"First"} Second ${"Third"} Fourth ${"Fifth"}</div>
          </div>
        `.p,
      ).toMatchSnapshot();
    });

    it("mixed 5", () => {
      expect(
        html`
          <div>
            Zero ${"First"}
            <div>Second ${"Third"}</div>
            ${"Fourth"} Fifth ${"Sixth"}
          </div>
        `.p,
      ).toMatchSnapshot();
    });

    it("mixed 6", () => {
      expect(
        html`<div>Zero ${"First"} Second ${"Third"} Fourth ${"Fifth"}</div>`.p,
      ).toMatchSnapshot();
    });

    it("mixed 7", () => {
      expect(
        html`<div>${"First"} Second ${"Third"} Fourth ${"Fifth"}</div>`.p,
      ).toMatchSnapshot();
    });

    it("mixed 8", () => {
      expect(
        html`
          <div>
            <div></div>
            <div>
              <div></div>
              <div>Zero ${"First"} Second ${"Third"} Fourth ${"Fifth"}</div>
            </div>
          </div>
        `.p,
      ).toMatchSnapshot();
    });

    it("mixed 9", () => {
      expect(
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
        `.p,
      ).toMatchSnapshot();
    });

    it("mixed 10", () => {
      expect(
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
        `.p,
      ).toMatchSnapshot();
    });

    it("mixed 11", () => {
      expect(
        html`
          <div>
            Zero <input /> ${"First"} ${"Fourth"} <input /> Fifth ${"Sixth"}
          </div>
        `.p,
      ).toMatchSnapshot();
    });

    it("mixed 12", () => {
      expect(
        html`
          <div>
            Zero <input /> One <input /> ${"First"} ${"Fourth"} <input /> Fifth
            ${"Sixth"}
          </div>
        `.p,
      ).toMatchSnapshot();
    });

    it("mixed 13", () => {
      expect(
        html`
          <div>
            Zero <input /> Something else
            <div>Text</div>
            <input /> Fifth ${"Sixth"}
          </div>
        `.p,
      ).toMatchSnapshot();
    });

    it("mixed 14", () => {
      expect(
        html`
          <div onclick=${() => {}}>First row: ${1}</div>
          <div onclick=${() => {}}>Second row: ${2}</div>
        `.p,
      ).toMatchSnapshot();
    });

    it("mixed 15", () => {
      expect(
        html`
          <div onclick=${() => {}}>First row: ${1} by me</div>
          <div onclick=${() => {}}>Second row: ${2} by me</div>
        `.p,
      ).toMatchSnapshot();
    });
  });
});
