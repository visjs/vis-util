import { LayeredStorage } from "../../src/layered-storage";
import { expect } from "chai";

interface KV {
  "test.value": string;
  "test.value1": string;
  "test.value2": string;
  "unrelated.value": string;
}

/**
 * Test transactions.
 */
export function transactions(): void {
  describe("Transactions", function (): void {
    it("Transaction shouldn't save anything before commit", function (): void {
      const ls = new LayeredStorage<7, KV, keyof KV>();

      const transaction = ls.global.openTransaction();

      transaction.set(7, "test.value", "Hi!");

      expect(
        ls.global.has("test.value"),
        "The value shouldn't be set before commit"
      ).to.be.false;

      transaction.commit();

      expect(ls.global.has("test.value"), "The value shoud be set after commit")
        .to.be.true;
    });

    it("Transaction shouldn't save anything before commit", function (): void {
      const ls = new LayeredStorage<7, KV, keyof KV>();

      ls.setInvalidHandler((key, value, message): void => {
        throw new TypeError(
          "Invalid value was supplied: " +
            JSON.parse(JSON.stringify({ key, value, message }))
        );
      });

      ls.setValidators("test.value1", [
        (value): true | string =>
          value.length < 4 ? "Minimum of 4 characters required" : true,
      ]);
      ls.setValidators("test.value2", [
        (value): true | string =>
          value.length < 4 ? "Minimum of 4 characters required" : true,
      ]);

      const transaction = ls.global.openTransaction();

      expect((): void => {
        transaction.set(7, "test.value1", "Hi!");
      }, "The value should be validated right away").to.throw();
      transaction.set(7, "test.value2", "Hi there!");

      transaction.commit();

      expect(
        ls.global.has("test.value1"),
        "Invalid values shouldn't be committed if commit is called"
      ).to.be.false;
    });
  });
}
