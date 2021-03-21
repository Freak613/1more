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
  });
});
