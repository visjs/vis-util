import { expect } from "chai";
import { stub } from "sinon";

import { getAbsoluteLeft, getAbsoluteRight, getAbsoluteTop } from "../src";

describe("getAbsolute*", function(): void {
  const elem = { getBoundingClientRect: stub() };
  elem.getBoundingClientRect.returns({
    top: 1,
    right: 2,
    bottom: 3,
    left: 4
  });

  it("getAbsoluteTop", function(): void {
    expect(getAbsoluteTop(elem as any)).to.equal(1);
  });

  it("getAbsoluteRight", function(): void {
    expect(getAbsoluteRight(elem as any)).to.equal(2);
  });

  it("getAbsoluteLeft", function(): void {
    expect(getAbsoluteLeft(elem as any)).to.equal(4);
  });
});
