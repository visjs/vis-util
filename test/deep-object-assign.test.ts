import { expect } from "chai";
import { describe, it } from "mocha";

import { DELETE, deepObjectAssign } from "../src/index.ts";

// Symbols don't currently work in the library, they're either completely
// ignored or outright throw errors when tested.

// const SYMBOL_KEY = Symbol("key");
// const SYMBOL_ORIGINAL = Symbol("original");
// const SYMBOL_NEW = Symbol("new");

describe("deepObjectAssign", function (): void {
  it("should return empty object for empty inputs", function (): void {
    expect(deepObjectAssign({})).to.deep.equal({});
    expect(deepObjectAssign({}, {})).to.deep.equal({});
    expect(deepObjectAssign({}, {}, {})).to.deep.equal({});
  });

  it("should merge simple objects", function (): void {
    expect(
      deepObjectAssign({ zero: 0, two: 0 }, { one: 1, two: 2 }),
    ).to.deep.equal({
      zero: 0,
      one: 1,
      two: 2,
    });
  });

  it("should merge arrays in objects", function (): void {
    expect(
      deepObjectAssign({ zero: [0], two: [0, 0] }, { one: [1], two: [2] }),
    ).to.deep.equal({
      zero: [0],
      one: [1],
      two: [2],
    });
  });

  it("should merge nested arrays and objects", function (): void {
    expect(
      deepObjectAssign(
        { zero: [0], two: [[0], 0] },
        { one: [[1], { ONE: 1 }], two: [{ TWO: [2] }] },
      ),
    ).to.deep.equal({
      zero: [0],
      one: [[1], { ONE: 1 }],
      two: [{ TWO: [2] }],
    });
  });

  it("should merge multiple objects with nested properties", function (): void {
    expect(
      deepObjectAssign(
        { zero: 0, two: 0 },
        { one: 1, two: 1 },
        { two: 2 },
        { nested: { threeThenOne: 1 } },
      ),
    ).to.deep.equal({
      zero: 0,
      one: 1,
      two: 2,
      nested: { threeThenOne: 1 },
    });
  });

  it("should merge multiple objects with nested properties", function (): void {
    expect(
      deepObjectAssign(
        { zero: 0, two: 0 },
        { one: 1, two: 1 },
        { two: 2 },
        { nested: { threeThenOne: 1 } },
      ),
    ).to.deep.equal({
      zero: 0,
      one: 1,
      two: 2,
      nested: { threeThenOne: 1 },
    });
  });

  it("should preserve existing values when merging", function (): void {
    expect(
      deepObjectAssign(
        {
          bolean: true,
          id: 0.25,
          number: 37,
          string: "oops",
          // symbol: SYMBOL_ORIGINAL,
        },
        {
          bolean: true,
          number: 42,
          string: "yay",
          // symbol: SYMBOL_NEW,
        },
      ),
    ).to.deep.equal({
      bolean: true,
      id: 0.25,
      number: 42,
      string: "yay",
      // symbol: SYMBOL_NEW,
    });
  });

  it("should handle falsy values correctly", function (): void {
    expect(
      deepObjectAssign(
        {
          bolean: false,
          id: 0.25,
          number: Number.NaN,
          string: "",
          // symbol: SYMBOL_ORIGINAL,
        },
        {
          bolean: true,
          number: 42,
          string: "yay",
          // symbol: SYMBOL_NEW,
        },
      ),
    ).to.deep.equal({
      bolean: true,
      id: 0.25,
      number: 42,
      string: "yay",
      // symbol: SYMBOL_NEW,
    });

    expect(
      deepObjectAssign(
        {
          bolean: true,
          id: 0.25,
          number: 4,
          string: "oops",
          // symbol: SYMBOL_ORIGINAL,
        },
        {
          bolean: false,
          number: Number.NaN,
          string: "",
          // symbol: SYMBOL_NEW,
        },
      ),
    ).to.deep.equal({
      bolean: false,
      id: 0.25,
      number: Number.NaN,
      string: "",
      // symbol: SYMBOL_NEW,
    });
  });

  it("should delete properties with DELETE symbol", function (): void {
    expect(
      deepObjectAssign(
        {
          bolean: true,
          id: 0.25,
          number: 4,
          string: "oops",
          // symbol: SYMBOL_ORIGINAL,
        },
        {
          bolean: DELETE,
          number: DELETE,
          string: DELETE,
          symbol: DELETE,
        },
      ),
    ).to.deep.equal({
      id: 0.25,
    });

    expect(
      deepObjectAssign(
        {
          id: 0.25,
          one: {
            two: {
              three: {
                four: "oops",
              },
            },
          },
        },
        {
          one: DELETE,
        },
      ),
    ).to.deep.equal({
      id: 0.25,
    });
  });

  it("should handle DELETE on nested properties", function (): void {
    expect(
      deepObjectAssign(
        {
          id: 0.25,
          one: {
            two: {
              three: {
                four: "oops",
              },
            },
          },
        },
        {
          one: { miss: DELETE },
        },
      ),
    ).to.deep.equal({
      id: 0.25,
      one: {
        two: {
          three: {
            four: "oops",
          },
        },
      },
    });

    expect(
      deepObjectAssign(
        {
          id: 0.25,
          one: {
            two: {
              three: {
                four: "oops",
              },
            },
          },
        },
        {
          double: { miss: DELETE },
        },
      ),
    ).to.deep.equal({
      id: 0.25,
      one: {
        two: {
          three: {
            four: "oops",
          },
        },
      },
      double: {},
    });
  });

  it("should delete nested properties while preserving siblings", function (): void {
    expect(
      deepObjectAssign(
        {
          id: 0.25,
          one: {
            two: {
              survivor: "yay",
              three: {
                four: "oops",
              },
            },
          },
        },
        {
          one: { two: { three: DELETE } },
        },
      ),
    ).to.deep.equal({
      id: 0.25,
      one: {
        two: {
          survivor: "yay",
        },
      },
    });
  });

  it("should handle numeric properties", function (): void {
    expect(
      deepObjectAssign(
        {
          id: 0.25,
          // [SYMBOL_KEY]: 1,
        },
        {
          // [SYMBOL_KEY]: 2,
        },
      ),
    ).to.deep.equal({
      id: 0.25,
      // [SYMBOL_KEY]: 2,
    });
  });

  it("should handle basic object merging", function (): void {
    expect(
      deepObjectAssign(
        {},
        {
          foo: "bar",
          deleteFoo: "foo",
        },
      ),
    ).to.deep.equal({
      foo: "bar",
      deleteFoo: "foo",
    });
  });

  it("should handle Date objects", function (): void {
    const date = new Date(0);
    const date2 = new Date(50000);
    const date3 = new Date(150000);

    // Merge single date into empty object
    expect(
      deepObjectAssign(
        {},
        {
          start: date,
        },
      ),
    ).to.deep.equal({
      start: date,
    });

    // Merge single date into non-empty object (no overlap)
    expect(
      deepObjectAssign(
        { start: date },
        {
          end: date2,
        },
      ),
    ).to.deep.equal({
      start: date,
      end: date2,
    });

    // Merge single date into non-empty object (overlap)
    expect(
      deepObjectAssign(
        { start: date, end: date2 },
        {
          end: date3,
        },
      ),
    ).to.deep.equal({
      start: date,
      end: date3,
    });
  });
});
