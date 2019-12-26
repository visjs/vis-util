import {
  LayeredStorage,
  FilteredKeyValuePair
} from "../../src/layered-storage";
import { expect } from "chai";

interface KV {
  test: string; // `${test.boolean} ${test.number} ${test.string}`
  "test.boolean": boolean;
  "test.number": number;
  "test.string": string;
}

/**
 * Test that values can be set and retrieved from single monolithic layer.
 */
export function expanders(): void {
  describe("Expanders", function(): void {
    const expanderAffects = [
      "test.boolean",
      "test.number",
      "test.string"
    ] as const;
    const expander = (
      input: string
    ): readonly FilteredKeyValuePair<
      KV,
      "test.boolean" | "test.number" | "test.string"
    >[] => {
      const [boolean, number, string] = input.split(" ");
      return [
        ["test.boolean", boolean === "true" ? true : false],
        ["test.number", +number],
        ["test.string", string]
      ] as const;
    };
    const invalidHandler = (): never => {
      throw new Error("Invalid input.");
    };

    it("Without validation", function(): void {
      const ls = new LayeredStorage<KV, 0>();

      ls.setExpander("test", expanderAffects, expander);

      const testValue = "false 7 seven";

      ls.set(0, "test", testValue);

      expect(ls.has("test"), "The raw value should not be saved.").to.be.false;

      expect(
        [ls.get("test.boolean"), ls.get("test.number"), ls.get("test.string")],
        "The expanded values from the expander should be returned."
      ).to.deep.equal([false, 7, "seven"]);
    });

    it("Invalid short value", function(): void {
      const ls = new LayeredStorage<KV, 0>();

      ls.setValidators("test", [
        (value): true | string =>
          /^(true|false) \d+ .*$/.test(value) || "Invalid."
      ]);
      ls.setInvalidHandler(invalidHandler);
      ls.setExpander("test", expanderAffects, expander);

      const testValue = "false7seven";

      expect(
        (): void => void ls.set(0, "test", testValue),
        "Invalid values should not pass validation."
      ).to.throw();
    });

    it("Invalid expanded value", function(): void {
      const ls = new LayeredStorage<KV, 0>();

      ls.setValidators("test.number", [
        (value): true | string => value < 7 || "Invalid input."
      ]);
      ls.setInvalidHandler(invalidHandler);
      ls.setExpander("test", expanderAffects, expander);

      const testValue = "false 7 seven";

      expect(
        (): void => void ls.set(0, "test", testValue),
        "Invalid values should not pass validation."
      ).to.throw();
    });

    it("Delete expanded values", function(): void {
      const ls = new LayeredStorage<KV, 0>();

      ls.setExpander("test", expanderAffects, expander);

      const testValue = "false 7 seven";

      ls.set(0, "test", testValue);
      expect(
        [ls.has("test.boolean"), ls.has("test.number"), ls.has("test.string")],
        "All expanded values should be set."
      ).deep.equal([true, true, true]);

      ls.delete(0, "test");
      expect(
        [ls.has("test.boolean"), ls.has("test.number"), ls.has("test.string")],
        "All expanded values should be deleted."
      ).deep.equal([false, false, false]);
    });
  });
}
