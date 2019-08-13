import { expect } from "chai";

import { addClassName } from "../src";

describe("addClassName", function(): void {
  const inputs: { input: string; classes: string; expected: string }[] = [
    { input: "a b c", classes: "a c", expected: "a b c" },
    { input: "a b c", classes: "d", expected: "a b c d" },
    { input: "c", classes: "a b", expected: "c a b" },
    {
      input: "class-1 class-2",
      classes: "class-3",
      expected: "class-1 class-2 class-3"
    }
  ];

  inputs.forEach(({ input, classes, expected }): void => {
    it(`${input} + ${classes} = ${expected}`, function(): void {
      const elem = { className: input };

      addClassName(elem as any, classes);

      expect(elem.className).to.equal(expected);
    });
  });
});
