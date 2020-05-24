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
      const ls = new LayeredStorage<1 | 2 | 3 | 4, KV, keyof KV>();

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
      const ls = new LayeredStorage<1 | 2 | 3 | 4, KV, keyof KV>();

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
      const ls = new LayeredStorage<1 | 2 | 3 | 4, KV, keyof KV>();

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
      const ls = new LayeredStorage<1 | 2 | 3 | 4, KV, keyof KV>();

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
  });
}
