import { LayeredStorage } from "../../src/layered-storage";
import { deepFreeze } from "../helpers";
import { expect } from "chai";

interface KV {
  "test.value": { number: number; value: { string: string } };
  "unrelated.value": { number: number; value: { string: string } };
}

/**
 * Test that values can be set accross segments and later retrieved.
 */
export function segmentedLayer(): void {
  describe("Segmented layer", function(): void {
    const testValueA: KV["test.value"] = deepFreeze({
      number: 1,
      value: { string: "A" }
    });
    const testValueB: KV["test.value"] = deepFreeze({
      number: 2,
      value: { string: "B" }
    });
    const testValueC: KV["test.value"] = deepFreeze({
      number: 3,
      value: { string: "C" }
    });

    const a = Symbol("A");
    const b = Symbol("B");
    const c = Symbol("C");

    it("Get without set", function(): void {
      const ls = new LayeredStorage<KV, 7>();

      ls.set(7, "test.value", testValueA);

      expect(
        ls.get(b, "test.value"),
        "Monolithic value should be used if the segment doesn't exist."
      ).to.equal(testValueA);
    });

    it("Get without set after unrelated set", function(): void {
      const ls = new LayeredStorage<KV, 7>();

      ls.set(7, "test.value", testValueA);
      ls.set(7, b, "unrelated.value", testValueB);

      expect(
        ls.get(b, "test.value"),
        "Monolithic value should be used if the segment doesn't have it's own."
      ).to.equal(testValueA);
    });

    it("Set and get", function(): void {
      const ls = new LayeredStorage<KV, 7>();

      ls.set(7, a, "test.value", testValueA);
      ls.set(7, b, "test.value", testValueB);
      ls.set(7, c, "test.value", testValueC);

      expect(
        ls.get("test.value"),
        "Only segmented values were set, this should be undefined."
      ).to.be.undefined;

      expect(
        ls.get(a, "test.value"),
        "The A segment should return A test value."
      ).to.equal(testValueA);
      expect(
        ls.get(b, "test.value"),
        "The B segment should return B test value."
      ).to.equal(testValueB);
      expect(
        ls.get(c, "test.value"),
        "The C segment should return C test value."
      ).to.equal(testValueC);
    });

    it("Set and has", function(): void {
      const ls = new LayeredStorage<KV, 7>();

      ls.set(7, b, "test.value", testValueB);

      expect(ls.has("test.value"), "Only B segment was set and should be true.")
        .to.be.false;

      expect(
        ls.has(a, "test.value"),
        "Only B segment was set and should be true."
      ).to.be.false;
      expect(
        ls.has(b, "test.value"),
        "Only B segment was set and should be true."
      ).to.be.true;
      expect(
        ls.has(c, "test.value"),
        "Only B segment was set and should be true."
      ).to.be.false;
    });

    it("Set, delete and get", function(): void {
      const ls = new LayeredStorage<KV, 7>();

      expect(
        ls.get(c, "test.value"),
        "There is no value yet so it should be undefined."
      ).to.be.undefined;

      ls.set(7, c, "test.value", testValueC);
      expect(
        ls.get(c, "test.value"),
        "Layer 7 segment C has a value that should be returned."
      ).to.equal(testValueC);

      ls.delete(7, c, "test.value");
      expect(
        ls.get(c, "test.value"),
        "There isn't any value anymore so it should be undefined."
      ).to.be.undefined;
    });

    it("Set, delete and has", function(): void {
      const ls = new LayeredStorage<KV, 7>();

      expect(
        ls.get(c, "test.value"),
        "There is no value yet so it should be undefined."
      ).to.be.undefined;

      ls.set(7, c, "test.value", testValueC);
      expect(
        ls.has(c, "test.value"),
        "Layer 7 segment C has a value therefore it should return true."
      ).to.be.true;

      ls.delete(7, c, "test.value");
      expect(
        ls.has(c, "test.value"),
        "There isn't any value anymore so it should return false."
      ).to.be.false;
    });
  });
}
