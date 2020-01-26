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
      const ls = new LayeredStorage<7, KV, keyof KV>();

      ls.global.set(7, "test.value", testValueA);

      expect(
        ls.openSegment(b).get("test.value"),
        "Global value should be used if the segment doesn't exist."
      ).to.equal(testValueA);
    });

    it("Get without set after unrelated set", function(): void {
      const ls = new LayeredStorage<7, KV, keyof KV>();

      ls.global.set(7, "test.value", testValueA);
      ls.openSegment(b).set(7, "unrelated.value", testValueB);

      expect(
        ls.openSegment(b).get("test.value"),
        "Global value should be used if the segment doesn't have it's own."
      ).to.equal(testValueA);
    });

    it("Set and get", function(): void {
      const ls = new LayeredStorage<7, KV, keyof KV>();

      ls.openSegment(a).set(7, "test.value", testValueA);
      ls.openSegment(b).set(7, "test.value", testValueB);
      ls.openSegment(c).set(7, "test.value", testValueC);

      expect(
        ls.global.get("test.value"),
        "Only segmented values were set, this should be undefined."
      ).to.be.undefined;

      expect(
        ls.openSegment(a).get("test.value"),
        "The A segment should return A test value."
      ).to.equal(testValueA);
      expect(
        ls.openSegment(b).get("test.value"),
        "The B segment should return B test value."
      ).to.equal(testValueB);
      expect(
        ls.openSegment(c).get("test.value"),
        "The C segment should return C test value."
      ).to.equal(testValueC);
    });

    it("Set and has", function(): void {
      const ls = new LayeredStorage<7, KV, keyof KV>();

      ls.openSegment(b).set(7, "test.value", testValueB);

      expect(
        ls.global.has("test.value"),
        "Only B segment was set and should be true."
      ).to.be.false;

      expect(
        ls.openSegment(a).has("test.value"),
        "Only B segment was set and should be true."
      ).to.be.false;
      expect(
        ls.openSegment(b).has("test.value"),
        "Only B segment was set and should be true."
      ).to.be.true;
      expect(
        ls.openSegment(c).has("test.value"),
        "Only B segment was set and should be true."
      ).to.be.false;
    });

    it("Set, delete and get", function(): void {
      const ls = new LayeredStorage<7, KV, keyof KV>();

      expect(
        ls.openSegment(c).get("test.value"),
        "There is no value yet so it should be undefined."
      ).to.be.undefined;

      ls.openSegment(c).set(7, "test.value", testValueC);
      expect(
        ls.openSegment(c).get("test.value"),
        "Layer 7 segment C has a value that should be returned."
      ).to.equal(testValueC);

      ls.openSegment(c).delete(7, "test.value");
      expect(
        ls.openSegment(c).get("test.value"),
        "There isn't any value anymore so it should be undefined."
      ).to.be.undefined;
    });

    it("Set, delete and has", function(): void {
      const ls = new LayeredStorage<7, KV, keyof KV>();

      expect(
        ls.openSegment(c).get("test.value"),
        "There is no value yet so it should be undefined."
      ).to.be.undefined;

      ls.openSegment(c).set(7, "test.value", testValueC);
      expect(
        ls.openSegment(c).has("test.value"),
        "Layer 7 segment C has a value therefore it should return true."
      ).to.be.true;

      ls.openSegment(c).delete(7, "test.value");
      expect(
        ls.openSegment(c).has("test.value"),
        "There isn't any value anymore so it should return false."
      ).to.be.false;
    });

    describe("Invalid layer names", function(): void {
      [undefined, null, "string", true, false, {}].forEach(
        (layer: any): void => {
          it("" + layer, function(): void {
            const ls = new LayeredStorage<0, KV, keyof KV>();

            expect(
              (): void =>
                void ls.openSegment(b).set(layer, "test.value", testValueB),
              "Layers have to be ordered which is only possible with numbers as that's the only thing that has universally accepted indisputable order."
            ).to.throw();
          });
        }
      );
    });
  });
}
