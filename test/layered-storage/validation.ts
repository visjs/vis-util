import {
  LayeredStorage,
  boolean,
  fail,
  number,
  numberInteger,
  pass,
  string,
} from "../../src/layered-storage";
import { expect } from "chai";

interface KV {
  "test.boolean": boolean;
  "test.fail": any;
  "test.integer": number;
  "test.number": number;
  "test.pass": any;
  "test.string": string;
}

/**
 * Test that values can be set and retrieved from single global layer.
 */
export function validation(): void {
  describe("Validation", function (): void {
    [
      // No handler.
      ["Default", false, null] as const,
      // Handler that does nothing.
      ["Ignore", false, (): void => {}] as const,
      // Handler that throws.
      [
        "Throw",
        true,
        (key: string, value: unknown, messages: string[]): void => {
          throw new TypeError(`${key}: ${value} (${messages.join(", ")})`);
        },
      ] as const,
    ].forEach(([name, throws, handler]): void => {
      describe(name, function (): void {
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
          [true, "test.string", "test"] as const,
        ].forEach(([valid, key, value]): void => {
          it(`${key}: ${value}`, function (): void {
            const ls = new LayeredStorage<0, KV, KV>();

            // Add handler.
            if (handler != null) {
              ls.setInvalidHandler(handler);
            }

            // Add validators.
            ls.setValidators("test.boolean", [boolean]);
            ls.setValidators("test.fail", [fail]);
            ls.setValidators("test.integer", [number, numberInteger]);
            ls.setValidators("test.number", [number]);
            ls.setValidators("test.pass", [pass]);
            ls.setValidators("test.string", [string]);

            if (valid) {
              expect((): void => {
                ls.global.set(0, key, value);
              }, "No error should be thrown for valid values.").to.not.throw();
              expect(
                ls.global.get(key),
                "Valid values should be saved in the storage."
              ).to.equal(value);
            } else {
              if (throws) {
                expect((): void => {
                  ls.global.set(0, key, value);
                }, "If the handler throws the set should throw too.").to.throw(
                  TypeError
                );
              } else {
                expect((): void => {
                  ls.global.set(0, key, value);
                }, "If the handler doesn't throw neither should the set.").to.not.throw();
              }
              expect(
                ls.global.has(key),
                "Invalid values should not be saved in the storage."
              ).to.be.false;
            }
          });
        });
      });
    });

    it("Setting validators twice", function (): void {
      const ls = new LayeredStorage<0, KV, KV>();

      expect((): void => {
        ls.setValidators("test.fail", [fail]);
        ls.setValidators("test.fail", [pass]);
      }, "Setting validators repeatedly without replace shoudn't be allowed.").to.throw();
    });
  });
}
