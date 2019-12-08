import { LayeredStorage } from "../../src/layered-storage";
import { expect } from "chai";

interface KV {
  "test.value1": boolean;
  "test.value2": number;
  "test.value3": string;
}

export function multipleKeys(): void {
  describe("Multiple keys", function(): void {
    const testValue1: KV["test.value1"] = false;
    const testValue2: KV["test.value2"] = 4;
    const testValue3: KV["test.value3"] = "abc";

    it("Set and get", function(): void {
      const ls = new LayeredStorage<KV, 3>();

      ls.set(3, "test.value1", testValue1);
      ls.set(3, "test.value2", testValue2);
      ls.set(3, "test.value3", testValue3);

      expect(
        ls.get("test.value1"),
        "The same value that was set should be returned."
      ).to.equal(testValue1);
      expect(
        ls.get("test.value2"),
        "The same value that was set should be returned."
      ).to.equal(testValue2);
      expect(
        ls.get("test.value3"),
        "The same value that was set should be returned."
      ).to.equal(testValue3);
    });

    it("Set and has", function(): void {
      const ls = new LayeredStorage<KV, 3>();

      ls.set(3, "test.value1", testValue1);
      ls.set(3, "test.value2", testValue2);
      ls.set(3, "test.value3", testValue3);

      expect(
        ls.has("test.value1"),
        "This value was set and should be reported as present."
      ).to.be.true;
      expect(
        ls.has("test.value2"),
        "This value was set and should be reported as present."
      ).to.be.true;
      expect(
        ls.has("test.value3"),
        "This value was set and should be reported as present."
      ).to.be.true;
    });

    it("Set, delete and get", function(): void {
      const ls = new LayeredStorage<KV, 3>();

      expect(
        ls.get("test.value2"),
        "There is no value yet so it should be undefined."
      ).to.be.undefined;

      ls.set(3, "test.value1", testValue1);
      expect(
        ls.get("test.value2"),
        "Different value was set, undefined should be returned."
      ).to.be.undefined;

      ls.set(3, "test.value2", testValue2);
      expect(
        ls.get("test.value2"),
        "The value that was set should also be returned."
      ).to.equal(testValue2);

      ls.delete(3, "test.value2");
      expect(
        ls.get("test.value2"),
        "Undefined should be returned for deleted values."
      ).to.be.undefined;
    });

    it("Set, delete and has", function(): void {
      const ls = new LayeredStorage<KV, 3>();

      expect(
        ls.has("test.value2"),
        "There is no value yet so it should be false."
      ).to.be.false;

      ls.set(3, "test.value1", testValue1);
      expect(
        ls.has("test.value2"),
        "Different value was set, false should be returned."
      ).to.be.false;

      ls.set(3, "test.value2", testValue2);
      expect(
        ls.has("test.value2"),
        "True should be returned for existing values."
      ).to.be.true;

      ls.delete(3, "test.value2");
      expect(
        ls.has("test.value2"),
        "False should be returned for deleted values."
      ).to.be.false;
    });
  });
}
