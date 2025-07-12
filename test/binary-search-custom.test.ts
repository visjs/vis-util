import { expect } from "chai";
import { assert, mock } from "sinon";
import { deepFreeze } from "./helpers";

import { binarySearchCustom } from "../src";

describe("binarySearchCustom", function (): void {
  const orderedItems = deepFreeze([
    { prop1: -79, nested: { prop2: -0.79 } },
    { prop1: -27, nested: { prop2: -0.27 } },
    { prop1: -18, nested: { prop2: -0.18 } },
    { prop1: -11, nested: { prop2: -0.11 } },
    { prop1: 4, nested: { prop2: 0.4 } },
    { prop1: 18, nested: { prop2: 0.18 } },
    { prop1: 28, nested: { prop2: 0.28 } },
    { prop1: 33, nested: { prop2: 0.33 } },
    { prop1: 37, nested: { prop2: 0.37 } },
    { prop1: 47, nested: { prop2: 0.47 } },
    { prop1: 64, nested: { prop2: 0.64 } },
    { prop1: 71, nested: { prop2: 0.71 } },
    { prop1: 71, nested: { prop2: 0.71 } },
    { prop1: 71, nested: { prop2: 0.71 } },
    { prop1: 71, nested: { prop2: 0.71 } },
    { prop1: 87, nested: { prop2: 0.87 } },
  ]);
  const comparatorFactory =
    (target: number): ((value: number) => -1 | 0 | 1) =>
    (value: number): -1 | 0 | 1 => {
      if (value < target) {
        return -1;
      } else if (value > target) {
        return 1;
      } else {
        return 0;
      }
    };

  describe("array[index][prop1]", function (): void {
    it("comparator args", function (): void {
      const bscMock = mock();
      bscMock.returns(0);

      binarySearchCustom(orderedItems, bscMock, "prop1");

      assert.calledOnce(bscMock);
      expect(
        bscMock.getCall(0).args,
        "The comparator should receive the value retrieved from the array item using the passed property name.",
      )
        .to.have.lengthOf(1)
        .and.to.have.ownProperty("0")
        .that.is.a("number");
    });

    it("missing item", function (): void {
      expect(
        binarySearchCustom(orderedItems, comparatorFactory(13), "prop1"),
      ).to.equal(-1);
    });

    it("present item", function (): void {
      expect(
        binarySearchCustom(orderedItems, comparatorFactory(28), "prop1"),
      ).to.equal(6);
    });

    it("multiple equal items", function (): void {
      expect(binarySearchCustom(orderedItems, comparatorFactory(71), "prop1"))
        .to.be.at.least(11)
        .and.at.most(14);
    });
  });

  describe("array[index][prop1][prop2]", function (): void {
    it("comparator args", function (): void {
      const bscMock = mock();
      bscMock.returns(0);

      binarySearchCustom(orderedItems, bscMock, "nested", "prop2");

      assert.calledOnce(bscMock);
      expect(
        bscMock.getCall(0).args,
        "The comparator should receive the value retrieved from the array item using the passed property names.",
      )
        .to.have.lengthOf(1)
        .and.to.have.ownProperty("0")
        .that.is.a("number");
    });

    it("missing item", function (): void {
      expect(
        binarySearchCustom(
          orderedItems,
          comparatorFactory(0.13),
          "nested",
          "prop2",
        ),
      ).to.equal(-1);
    });

    it("present item", function (): void {
      expect(
        binarySearchCustom(
          orderedItems,
          comparatorFactory(0.28),
          "nested",
          "prop2",
        ),
      ).to.equal(6);
    });

    it("multiple equal items", function (): void {
      expect(
        binarySearchCustom(
          orderedItems,
          comparatorFactory(0.71),
          "nested",
          "prop2",
        ),
      )
        .to.be.at.least(11)
        .and.at.most(14);
    });
  });
});
