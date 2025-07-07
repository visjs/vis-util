import jsdom_global from "jsdom-global";
import { expect } from "chai";

import { addCssText } from "../src/index.ts";

describe("addCssText", function (): void {
  beforeEach(function () {
    this.jsdom_global = jsdom_global();
  });

  afterEach(function () {
    this.jsdom_global();
  });

  it("Add color and background URL to nothing", function (): void {
    const element = document.createElement("div");
    element.style.cssText = "";

    addCssText(
      element,
      "color: blue; background: url(http://www.example.com:8080/b.jpg);",
    );

    expect(element.style.cssText).to.equal(
      'color: blue; background: url("http://www.example.com:8080/b.jpg");',
    );
  });

  it("Add nothing to color, margin and background URL", function (): void {
    const element = document.createElement("div");
    element.style.cssText =
      "color: red; margin: 1em; background: url(http://www.example.com:8080/a.jpg);";

    addCssText(element, "");

    expect(element.style.cssText).to.equal(
      'color: red; margin: 1em; background: url("http://www.example.com:8080/a.jpg");',
    );
  });

  it("Add padding to color, margin and background URL", function (): void {
    const element = document.createElement("div");
    element.style.cssText =
      "color: red; margin: 1em; background: url(http://www.example.com:8080/a.jpg);";

    addCssText(element, "padding: 4ex;");

    expect(element.style.cssText).to.equal(
      'color: red; margin: 1em; background: url("http://www.example.com:8080/a.jpg"); padding: 4ex;',
    );
  });

  it("Add color and background URL to color, margin and background URL", function (): void {
    const element = document.createElement("div");
    element.style.cssText =
      "color: red; margin: 1em; background: url(http://www.example.com:8080/a.jpg);";

    addCssText(
      element,
      "color: blue; background: url(http://www.example.com:8080/b.jpg);",
    );

    expect(element.style.cssText).to.equal(
      'color: blue; margin: 1em; background: url("http://www.example.com:8080/b.jpg");',
    );
  });
});
