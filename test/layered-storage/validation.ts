import { LayeredStorage } from "../../src/layered-storage";
import { expect } from "chai";

interface KV {
  "test.boolean": boolean;
  "test.fail": unknown;
  "test.integer": number;
  "test.number": number;
  "test.pass": unknown;
  "test.string": string;
}

/**
 * Test that values can be set and retrieved from single monolithic layer.
 */
export function validation(): void {
  describe("Validation", function(): void {
    [
      // No handler.
      ["Default", null, null] as const,
      // Handler that does nothing.
      ["Ignore", null, (): void => {}] as const,
      // Handler that throws.
      [
        "Throw",
        TypeError,
        (key: string, value: unknown, message: string): void => {
          throw new TypeError(`${key}: ${value} (${message})`);
        }
      ] as const
    ].forEach(([name, throws, handler]): void => {
      describe(name, function(): void {
        [
          [false, "test.boolean", 77] as const,
          [false, "test.fail", null] as const,
          [false, "test.integer", "3.5"] as const,
          [false, "test.integer", 3.5] as const,
          [false, "test.string", undefined] as const,
          [true, "test.boolean", true] as const,
          [true, "test.integer", 77] as const,
          [true, "test.number", 3.5] as const,
          [true, "test.number", 77] as const,
          [true, "test.pass", null] as const,
          [true, "test.string", "test"] as const
        ].forEach(([valid, key, value]): void => {
          it(`${key}: ${value}`, function(): void {
            const ls = new LayeredStorage<KV, 0>();

            // Add handler.
            if (handler != null) {
              ls.setInvalidHandler(handler);
            }

            // Add validators.
            ls.addValidators(
              "test.boolean",
              (value: unknown): true | string =>
                typeof value === "boolean" || "it's not valid"
            );
            ls.addValidators(
              "test.fail",
              (): true | string => false || "it's not valid"
            );
            ls.addValidators(
              "test.integer",
              // This tests multiple validators.
              (value: unknown): true | string =>
                typeof value === "number" || "it's not valid",
              (value: unknown): true | string =>
                (typeof value === "number" && value % 1 === 0) ||
                "it's not valid"
            );
            ls.addValidators(
              "test.number",
              (value: unknown): true | string =>
                typeof value === "number" || "it's not valid"
            );
            ls.addValidators("test.pass", (): true | string => true);
            ls.addValidators(
              "test.string",
              (value: unknown): true | string =>
                typeof value === "string" || "it's not valid"
            );

            if (valid) {
              expect((): void => {
                ls.set(0, key, value);
              }, "No error should be thrown for valid values.").to.not.throw();
              expect(
                ls.get(key),
                "Valid values should be saved in the storage."
              ).to.equal(value);
            } else {
              if (throws != null) {
                expect((): void => {
                  ls.set(0, key, value);
                }, "If the handler throws the set should throw too.").to.throw(
                  TypeError,
                  `${key}: ${value} (it's not valid)`
                );
              } else {
                expect((): void => {
                  ls.set(0, key, value);
                }, "If the handler doesn't throw neither should the set.").to.not.throw();
              }
              expect(
                ls.has(key),
                "Invalid values should not be saved in the storage."
              ).to.be.false;
            }
          });
        });
      });
    });
  });
}
