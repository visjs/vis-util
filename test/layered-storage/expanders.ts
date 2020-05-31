import {
  KeyValueEntry,
  LayeredStorage,
  match,
  numberLowerThan,
} from "../../src/layered-storage";
import { expect } from "chai";

interface KV {
  test: string; // `${test.boolean} ${test.number} ${test.string}`
  "test.boolean": boolean;
  "test.number": number;
  "test.string": string;
}

/**
 * Test that values can be set and retrieved from single global layer.
 */
export function expanders(): void {
  describe("Expanders", function (): void {
    const expanderAffects = [
      "test.boolean",
      "test.number",
      "test.string",
    ] as const;
    const expander = (
      input: string
    ): readonly KeyValueEntry<
      KV,
      "test.boolean" | "test.number" | "test.string"
    >[] => {
      const [boolean, number, string] = input.split(" ");
      return [
        ["test.boolean", boolean === "true" ? true : false],
        ["test.number", +number],
        ["test.string", string],
      ] as const;
    };
    const invalidHandler = (): never => {
      throw new Error("Invalid input.");
    };

    it("Without validation", function (): void {
      const ls = new LayeredStorage<0, KV, KV>();

      ls.setExpander("test", expanderAffects, expander);

      const testValue = "false 7 seven";

      ls.global.set(0, "test", testValue);

      expect(ls.global.has("test"), "The raw value should not be saved.").to.be
        .false;

      expect(
        [
          ls.global.get("test.boolean"),
          ls.global.get("test.number"),
          ls.global.get("test.string"),
        ],
        "The expanded values from the expander should be returned."
      ).to.deep.equal([false, 7, "seven"]);
    });

    it("Invalid short value", function (): void {
      const ls = new LayeredStorage<0, KV, KV>();

      ls.setValidators("test", [match(/^(true|false) \d+ .*$/)]);
      ls.setInvalidHandler(invalidHandler);
      ls.setExpander("test", expanderAffects, expander);

      const testValue = "false7seven";

      expect(
        (): void => void ls.global.set(0, "test", testValue),
        "Invalid values should not pass validation."
      ).to.throw();
    });

    it("Invalid expanded value", function (): void {
      const ls = new LayeredStorage<0, KV, KV>();

      ls.setValidators("test.number", [numberLowerThan(7)]);
      ls.setInvalidHandler(invalidHandler);
      ls.setExpander("test", expanderAffects, expander);

      const testValue = "false 7 seven";

      expect(
        (): void => void ls.global.set(0, "test", testValue),
        "Invalid values should not pass validation."
      ).to.throw();
    });

    it("Delete expanded values", function (): void {
      const ls = new LayeredStorage<0, KV, KV>();

      ls.setExpander("test", expanderAffects, expander);

      const testValue = "false 7 seven";

      ls.global.set(0, "test", testValue);
      expect(
        [
          ls.global.has("test.boolean"),
          ls.global.has("test.number"),
          ls.global.has("test.string"),
        ],
        "All expanded values should be set."
      ).deep.equal([true, true, true]);

      ls.global.delete(0, "test");
      expect(
        [
          ls.global.has("test.boolean"),
          ls.global.has("test.number"),
          ls.global.has("test.string"),
        ],
        "All expanded values should be deleted."
      ).deep.equal([false, false, false]);
    });
  });
}
