import { LayeredStorage } from "../../src/layered-storage";
import { deepFreeze } from "../helpers";
import { expect } from "chai";

type KV = Record<string, number>;

const allUndefined = deepFreeze({
  "test.value1": undefined,
  "test.value2": undefined,
  "test.value3": undefined
});

const expectedResult = deepFreeze({
  monolithic: {
    "test.value1": 5,
    "test.value2": undefined,
    "test.value3": undefined
  },
  a: {
    "test.value1": 5,
    "test.value2": 2,
    "test.value3": undefined
  },
  b: {
    "test.value1": 5,
    "test.value2": 8,
    "test.value3": 9
  },
  c: {
    "test.value1": 3,
    "test.value2": 7,
    "test.value3": undefined
  }
});

const expectedResultMinusC = deepFreeze({
  monolithic: expectedResult.monolithic,
  a: expectedResult.a,
  b: expectedResult.b,
  c: allUndefined
});

const expectedResultMinusAC = deepFreeze({
  monolithic: expectedResult.monolithic,
  a: allUndefined,
  b: expectedResult.b,
  c: allUndefined
});

const expectedResultMinusABC = deepFreeze({
  monolithic: expectedResult.monolithic,
  a: allUndefined,
  b: allUndefined,
  c: allUndefined
});

/**
 * Test all mutatins including segmented mutations with Layered Storage.
 */
export function allCombined(): void {
  describe("All combined", function(): void {
    it("Main instance only", function(): void {
      const ls = new LayeredStorage<KV, 1 | 4 | 9>();

      const getData = (): unknown => {
        const data: any = {};
        for (const segment of ["monolithic", "a", "b", "c"]) {
          data[segment] = {};
          for (const key of ["test.value1", "test.value2", "test.value3"]) {
            data[segment][key] =
              segment === "monolithic" ? ls.get(key) : ls.get(segment, key);
          }
        }

        return data;
      };

      ls.set(1, "b", "test.value3", 6);
      ls.set(1, "c", "test.value2", 7);
      ls.set(1, "a", "test.value1", 1);
      ls.delete(4, "b", "test.value1");
      ls.set(4, "test.value1", 4);
      ls.set(4, "b", "test.value3", 9);
      ls.delete(4, "c", "test.value1");
      ls.delete(9, "test.value1");
      ls.set(9, "test.value3", 3);
      ls.set(4, "a", "test.value2", 2);
      ls.set(9, "b", "test.value2", 8);
      ls.delete(9, "test.value3");
      ls.set(9, "test.value1", 5);
      ls.delete(4, "a", "test.value1");
      ls.set(9, "c", "test.value1", 3);
      expect(getData()).to.deep.equal(expectedResult);

      ls.deleteSegmentData("c");
      expect(getData()).to.deep.equal(expectedResultMinusC);

      ls.deleteSegmentData("a");
      expect(getData()).to.deep.equal(expectedResultMinusAC);

      ls.deleteSegmentData("b");
      expect(getData()).to.deep.equal(expectedResultMinusABC);
    });

    it("Main and segment instances", function(): void {
      const ls = new LayeredStorage<KV, 1 | 4 | 9>();

      const a = ls.openSegment("a");
      const b = ls.openSegment("b");
      const c = ls.openSegment("c");
      const segments = { a, b, c };

      const getData = (): unknown => {
        const data: any = {};
        for (const segment of [
          "monolithic" as const,
          "a" as const,
          "b" as const,
          "c" as const
        ]) {
          data[segment] = {};
          for (const key of ["test.value1", "test.value2", "test.value3"]) {
            data[segment][key] =
              segment === "monolithic"
                ? ls.get(key)
                : segments[segment].get(key);
          }
        }

        return data;
      };

      b.set(1, "test.value3", 6);
      c.set(1, "test.value2", 7);
      a.set(1, "test.value1", 1);
      b.delete(4, "test.value1");
      ls.set(4, "test.value1", 4);
      b.set(4, "test.value3", 9);
      c.delete(4, "test.value1");
      ls.delete(9, "test.value1");
      ls.set(9, "test.value3", 3);
      a.set(4, "test.value2", 2);
      b.set(9, "test.value2", 8);
      ls.delete(9, "test.value3");
      ls.set(9, "test.value1", 5);
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
  });
}
