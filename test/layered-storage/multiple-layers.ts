import { LayeredStorage } from "../../src/layered-storage";
import { deepFreeze } from "../helpers";
import { expect } from "chai";

interface KV {
  "test.value": { number: number; value: { string: string } };
}

/**
 * Test that values can be set accross layers and override each other the way
 * they should.
 */
export function multipleLayers(): void {
  describe("Multiple layers", function (): void {
    const testValue1: KV["test.value"] = deepFreeze({
      number: 1,
      value: { string: "test" },
    });
    const testValue2: KV["test.value"] = deepFreeze({
      number: 2,
      value: { string: "test" },
    });
    const testValue3: KV["test.value"] = deepFreeze({
      number: 3,
      value: { string: "test" },
    });
    const testValue4: KV["test.value"] = deepFreeze({
      number: 4,
      value: { string: "test" },
    });

    it("Set and get", function (): void {
      const ls = new LayeredStorage<1 | 2 | 3 | 4, KV, KV>();

      ls.global.set(1, "test.value", testValue1);
      expect(
        ls.global.get("test.value"),
        "The first layer should be returned since it's the highest."
      ).to.equal(testValue1);

      ls.global.set(2, "test.value", testValue2);
      expect(
        ls.global.get("test.value"),
        "The second layer should be returned since it's the highest."
      ).to.equal(testValue2);

      ls.global.set(4, "test.value", testValue4);
      expect(
        ls.global.get("test.value"),
        "The fourth layer should be returned since it's the highest now."
      ).to.equal(testValue4);
    });

    it("Set and has", function (): void {
      const ls = new LayeredStorage<1 | 2 | 3 | 4, KV, KV>();

      expect(
        ls.global.has("test.value"),
        "There is no value yet so it shouldn't be reported as empty."
      ).to.be.false;

      ls.global.set(3, "test.value", testValue3);
      expect(
        ls.global.has("test.value"),
        "There is one value so it should be reported as present."
      ).to.be.true;

      ls.global.set(2, "test.value", testValue2);
      expect(
        ls.global.has("test.value"),
        "There are two value so it should be reported as present."
      ).to.be.true;
    });

    it("Set, delete and get", function (): void {
      const ls = new LayeredStorage<1 | 2 | 3 | 4, KV, KV>();

      expect(
        ls.global.get("test.value"),
        "There is no value yet so it should be undefined."
      ).to.be.undefined;

      ls.global.set(3, "test.value", testValue3);
      expect(
        ls.global.get("test.value"),
        "Layer three has a value that should be returned."
      ).to.equal(testValue3);

      ls.global.set(2, "test.value", testValue2);
      expect(
        ls.global.get("test.value"),
        "Layer three has a value that should be returned."
      ).to.equal(testValue3);

      ls.global.delete(3, "test.value");
      expect(
        ls.global.get("test.value"),
        "Layer two has a value that should be returned."
      ).to.equal(testValue2);

      ls.global.delete(2, "test.value");
      expect(
        ls.global.get("test.value"),
        "There isn't any value anymore so it should be undefined."
      ).to.be.undefined;
    });

    it("Set, delete and has", function (): void {
      const ls = new LayeredStorage<1 | 2 | 3 | 4, KV, KV>();

      expect(
        ls.global.has("test.value"),
        "There is no value yet so it should be reported as empty."
      ).to.be.false;

      ls.global.set(3, "test.value", testValue3);
      expect(
        ls.global.has("test.value"),
        "There is one value so it should be reported as present."
      ).to.be.true;

      ls.global.set(2, "test.value", testValue2);
      expect(
        ls.global.has("test.value"),
        "There are two value so it should be reported as present."
      ).to.be.true;

      ls.global.delete(2, "test.value");
      expect(
        ls.global.has("test.value"),
        "There is one value so it should be reported as present."
      ).to.be.true;

      ls.global.delete(3, "test.value");
      expect(
        ls.global.has("test.value"),
        "There isn't any value anymore so it should be reported as empty."
      ).to.be.false;
    });

    describe("Delete layer", function (): void {
      it("Segment layer", function (): void {
        const ls = new LayeredStorage<
          1 | 2 | 3,
          { test: string },
          { test: string }
        >();

        const a = ls.openSegment("A");
        a.set(1, "test", "A1");
        a.set(2, "test", "A2");
        a.set(3, "test", "A3");

        const b = ls.openSegment("B");
        b.set(1, "test", "B1");
        b.set(2, "test", "B2");
        b.set(3, "test", "B3");

        expect(a.get("test"), "The initial data should be set.").to.equal("A3");
        expect(b.get("test"), "The initial data should be set.").to.equal("B3");

        b.deleteLayer(2);

        expect(a.get("test"), "Other segments shouldn't be affected.").to.equal(
          "A3"
        );
        expect(
          b.get("test"),
          "The 2nd layer is gone but the 3rd is still in place and should be returned."
        ).to.equal("B3");

        b.deleteLayer(3);

        expect(a.get("test"), "Other segments shouldn't be affected.").to.equal(
          "A3"
        );
        expect(
          b.get("test"),
          "The 3rd and 2nd layers has been deleted, the 1st layer should be returned."
        ).to.equal("B1");
      });

      it("Global layer", function (): void {
        const ls = new LayeredStorage<
          1 | 2 | 3,
          { test: string },
          { test: string }
        >();

        ls.global.set(1, "test", "g1");
        ls.global.set(2, "test", "g2");
        ls.global.set(3, "test", "g3");

        const a = ls.openSegment("A");
        a.set(1, "test", "A1");

        expect(
          ls.global.get("test"),
          "The initial data should be set."
        ).to.equal("g3");
        expect(a.get("test"), "The initial data should be set.").to.equal("g3");

        ls.global.deleteLayer(2);

        expect(
          ls.global.get("test"),
          "The 2nd global layer is gone but the 3rd is still in place and should be returned."
        ).to.equal("g3");
        expect(
          a.get("test"),
          "The 2nd global layer is gone but the 3rd is still in place and should be returned."
        ).to.equal("g3");

        ls.global.deleteLayer(3);

        expect(
          ls.global.get("test"),
          "The 3rd and 2nd global layers are gone, the global 1st layer value should be returned."
        ).to.equal("g1");
        expect(
          a.get("test"),
          "The 3rd and 2nd global layers are gone, this segment has it's own 1st layer value which should be returned."
        ).to.equal("A1");
      });
    });
  });
}
