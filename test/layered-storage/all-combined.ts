import { LayeredStorage } from "../../src/layered-storage";
import { deepFreeze } from "../helpers";
import { expect } from "chai";

type KV = Record<string, number>;

const expectedResult = deepFreeze({
  global: {
    "test.value1": 5,
    "test.value2": undefined,
    "test.value3": undefined,
  },
  a: {
    "test.value1": 5,
    "test.value2": 2,
    "test.value3": undefined,
  },
  b: {
    "test.value1": 5,
    "test.value2": 8,
    "test.value3": 9,
  },
  c: {
    "test.value1": 3,
    "test.value2": 7,
    "test.value3": undefined,
  },
});

const expectedResultMinusC = deepFreeze({
  global: expectedResult.global,
  a: expectedResult.a,
  b: expectedResult.b,
  c: expectedResult.global,
});

const expectedResultMinusAC = deepFreeze({
  global: expectedResult.global,
  a: expectedResult.global,
  b: expectedResult.b,
  c: expectedResult.global,
});

const expectedResultMinusABC = deepFreeze({
  global: expectedResult.global,
  a: expectedResult.global,
  b: expectedResult.global,
  c: expectedResult.global,
});

/**
 * Test all mutatins including segmented mutations with Layered Storage.
 */
export function allCombined(): void {
  it("All combined", function (): void {
    const ls = new LayeredStorage<1 | 4 | 9, KV, keyof KV>();

    const a = ls.openSegment("a");
    const b = ls.openSegment("b");
    const c = ls.openSegment("c");
    const segments = { a, b, c };

    const getData = (): unknown => {
      const data: any = {};
      for (const segment of [
        "global" as const,
        "a" as const,
        "b" as const,
        "c" as const,
      ]) {
        data[segment] = {};
        for (const key of ["test.value1", "test.value2", "test.value3"]) {
          data[segment][key] =
            segment === "global"
              ? ls.global.get(key)
              : segments[segment].get(key);
        }
      }

      return data;
    };

    b.set(1, "test.value3", 6);
    c.set(1, "test.value2", 7);
    a.set(1, "test.value1", 1);
    b.delete(4, "test.value1");
    ls.global.set(4, "test.value1", 4);
    b.set(4, "test.value3", 9);
    c.delete(4, "test.value1");
    ls.global.delete(9, "test.value1");
    ls.global.set(9, "test.value3", 3);
    a.set(4, "test.value2", 2);
    b.set(9, "test.value2", 8);
    ls.global.delete(9, "test.value3");
    ls.global.set(9, "test.value1", 5);
    a.delete(4, "test.value1");
    c.set(9, "test.value1", 3);
    expect(getData()).to.deep.equal(expectedResult);

    c.close();
    expect(getData()).to.deep.equal(expectedResultMinusC);

    a.close();
    expect(getData()).to.deep.equal(expectedResultMinusAC);

    b.close();
    expect(getData()).to.deep.equal(expectedResultMinusABC);
  });
}
