import jsdom_global from "jsdom-global";
import { expect } from "chai";

import { removeCssText } from "../src";

describe("removeCssText", function (): void {
  beforeEach(function () {
    this.jsdom_global = jsdom_global();
  });

  afterEach(function () {
    this.jsdom_global();
  });

  it("Remove color and background URL from nothing", function (): void {
    const element = document.createElement("div");
    element.style.cssText = "";

    removeCssText(
      element,
      "color: blue; background: url(http://www.example.com:8080/b.jpg);"
    );

    expect(element.style.cssText).to.equal("");
  });

  it("Remove nothing from color, margin and background URL", function (): void {
    const element = document.createElement("div");
    element.style.cssText =
      "color: red; margin: 1em; background: url(http://www.example.com:8080/a.jpg);";

    removeCssText(element, "");

    expect(element.style.cssText).to.equal(
      "color: red; margin: 1em; background: url(http://www.example.com:8080/a.jpg);"
    );
  });

  it("Remove padding from color, margin and background URL", function (): void {
    const element = document.createElement("div");
    element.style.cssText =
      "color: red; margin: 1em; background: url(http://www.example.com:8080/a.jpg);";

    removeCssText(element, "padding: 4ex;");

    expect(element.style.cssText).to.equal(
      "color: red; margin: 1em; background: url(http://www.example.com:8080/a.jpg);"
    );
  });

  it("Remove color and background URL from color, margin and background URL", function (): void {
    const element = document.createElement("div");
    element.style.cssText =
      "color: red; margin: 1em; background: url(http://www.example.com:8080/a.jpg);";

    removeCssText(
      element,
      "color: blue; background: url(http://www.example.com:8080/b.jpg);"
    );

    expect(element.style.cssText).to.equal("margin: 1em;");
  });
});
