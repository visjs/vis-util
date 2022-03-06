import { given, test } from "sazerac";

import { DELETE, deepObjectAssign } from "../src";

// Symbols don't currently work in the library, they're either completely
// ignored or outright throw errors when tested.

// const SYMBOL_KEY = Symbol("key");
// const SYMBOL_ORIGINAL = Symbol("original");
// const SYMBOL_NEW = Symbol("new");

test(deepObjectAssign, (): void => {
  given({}).expect({});
  given({}, {}).expect({});
  given({}, {}, {}).expect({});

  given({ zero: 0, two: 0 }, { one: 1, two: 2 }).expect({
    zero: 0,
    one: 1,
    two: 2,
  });

  given({ zero: [0], two: [0, 0] }, { one: [1], two: [2] }).expect({
    zero: [0],
    one: [1],
    two: [2],
  });

  given(
    { zero: [0], two: [[0], 0] },
    { one: [[1], { ONE: 1 }], two: [{ TWO: [2] }] }
  ).expect({
    zero: [0],
    one: [[1], { ONE: 1 }],
    two: [{ TWO: [2] }],
  });

  given(
    { zero: 0, two: 0 },
    { one: 1, two: 1 },
    { two: 2 },
    { nested: { threeThenOne: 1 } }
  ).expect({
    zero: 0,
    one: 1,
    two: 2,
    nested: { threeThenOne: 1 },
  });

  given(
    { zero: 0, two: 0 },
    { one: 1, two: 1 },
    { two: 2 },
    { nested: { threeThenOne: 1 } }
  ).expect({
    zero: 0,
    one: 1,
    two: 2,
    nested: { threeThenOne: 1 },
  });

  given(
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
    }
  ).expect({
    bolean: true,
    id: 0.25,
    number: 42,
    string: "yay",
    // symbol: SYMBOL_NEW,
  });

  given(
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
    }
  ).expect({
    bolean: true,
    id: 0.25,
    number: 42,
    string: "yay",
    // symbol: SYMBOL_NEW,
  });

  given(
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
    }
  ).expect({
    bolean: false,
    id: 0.25,
    number: Number.NaN,
    string: "",
    // symbol: SYMBOL_NEW,
  });

  given(
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
    }
  ).expect({
    id: 0.25,
  });

  given(
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
    }
  ).expect({
    id: 0.25,
  });

  given(
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
    }
  ).expect({
    id: 0.25,
    one: {
      two: {
        three: {
          four: "oops",
        },
      },
    },
  });

  given(
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
    }
  ).expect({
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

  given(
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
    }
  ).expect({
    id: 0.25,
    one: {
      two: {
        survivor: "yay",
      },
    },
  });

  given(
    {
      id: 0.25,
      // [SYMBOL_KEY]: 1,
    },
    {
      // [SYMBOL_KEY]: 2,
    }
  ).expect({
    id: 0.25,
    // [SYMBOL_KEY]: 2,
  });

  given({}, { foo: "bar", deleteFoo: "foo" }).expect({
    foo: "bar",
    deleteFoo: "foo",
  });
});
