import { LayeredStorage } from "../../src/layered-storage";
import { deepFreeze } from "../helpers";
import { expect } from "chai";

interface KV {
  "test.value": { number: number; value: { string: string } };
}

/**
 * Test that values can be set and retrieved from single global layer.
 */
export function singleLayer(): void {
  describe("Single layer", function (): void {
    const testValue: KV["test.value"] = deepFreeze({
      number: 7,
      value: { string: "test" },
    });

    it("Set and get", function (): void {
      const ls = new LayeredStorage<0, KV, KV>();

      ls.global.set(0, "test.value", testValue);
      expect(
        ls.global.get("test.value"),
        "The same value that was set should be returned."
      ).to.equal(testValue);
    });

    it("Set and has", function (): void {
      const ls = new LayeredStorage<0, KV, KV>();

      ls.global.set(0, "test.value", testValue);
      expect(
        ls.global.has("test.value"),
        "The value should be reported as present after being set."
      ).to.be.true;
    });

    it("Set, delete and get", function (): void {
      const ls = new LayeredStorage<0, KV, KV>();

      expect(
        ls.global.get("test.value"),
        "There is no value yet so it should be undefined."
      ).to.be.undefined;

      ls.global.set(0, "test.value", testValue);
      expect(
        ls.global.get("test.value"),
        "The same value that was set should be returned."
      ).to.equal(testValue);

      ls.global.delete(0, "test.value");
      expect(
        ls.global.get("test.value"),
        "Undefined should be returned for deleted values."
      ).to.be.undefined;
    });

    it("Set, delete and has", function (): void {
      const ls = new LayeredStorage<0, KV, KV>();

      expect(
        ls.global.has("test.value"),
        "There is no value yet so it should be reported as empty."
      ).to.be.false;

      ls.global.set(0, "test.value", testValue);
      expect(
        ls.global.has("test.value"),
        "The value should be reported as present after being set."
      ).to.be.true;

      ls.global.delete(0, "test.value");
      expect(
        ls.global.has("test.value"),
        "The value should be reported as not present after being deleted."
      ).to.be.false;
    });

    it("Export", function (): void {
      interface LocalKV {
        "test.deeply.nested.value": string;
        "test.deeply.not-exported-value": string;
        "test.deeply.value": string;
        "test.value": string;
      }

      const ls = new LayeredStorage<0 | 2, LocalKV, LocalKV>();

      ls.global.set(0, "test.value", "0tv");
      ls.global.set(2, "test.deeply.nested.value", "2tdnv");
      ls.global.set(2, "test.deeply.value", "2tdv");
      ls.global.set(2, "test.deeply.not-exported-value", "2tdn");
      ls.global.set(0, "test.deeply.nested.value", "0tdnv");

      expect(
        ls.global.exportToObject([
          "test.deeply.nested.value",
          "test.deeply.value",
          "test.value",
        ]),
        "All requested values should be exported."
      ).to.deep.equal({
        test: {
          value: "0tv",
          deeply: {
            nested: {
              value: "2tdnv",
            },
            value: "2tdv",
          },
        },
      });
    });

    describe("Invalid layer names", function (): void {
      [undefined, null, "string", true, false, {}].forEach(
        (layer: any): void => {
          it("" + layer, function (): void {
            const ls = new LayeredStorage<0, KV, KV>();

            expect(
              (): void => void ls.global.set(layer, "test.value", testValue),
              "Layers have to be ordered which is only possible with numbers as that's the only thing that has universally accepted indisputable order."
            ).to.throw();
          });
        }
      );
    });
  });
}
