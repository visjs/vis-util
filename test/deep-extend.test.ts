import { expect } from "chai";
import { deepFreeze } from "./helpers";

import { deepExtend } from "../src";

describe("deepExtend", function(): void {
  it("nested strings", function(): void {
    const target = {
      p1: "p1 T",
      p2: "p2 T",
      p4: {
        p4p1: "p4p1 T",
        p4p2: "p4p2 T",
        p4p4: {
          p4p4p1: "p4p4p1 T",
          p4p4p2: "p4p4p2 T"
        }
      }
    };
    const source = deepFreeze({
      p2: "p2 S",
      p3: "p3 S",
      p4: {
        p4p2: "p4p2 S",
        p4p3: "p4p3 S",
        p4p4: {
          p4p4p2: "p4p4p2 S",
          p4p4p3: "p4p4p3 S"
        }
      }
    });

    const merged = deepExtend(target, source);

    expect(merged, "They should be the same instance.").to.equal(target);
    expect(merged, "All the properties should be deeply merged.").to.deep.equal(
      {
        p1: "p1 T",
        p2: "p2 S",
        p3: "p3 S",
        p4: {
          p4p1: "p4p1 T",
          p4p2: "p4p2 S",
          p4p3: "p4p3 S",
          p4p4: {
            p4p4p1: "p4p4p1 T",
            p4p4p2: "p4p4p2 S",
            p4p4p3: "p4p4p3 S"
          }
        }
      }
    );
  });

  it("arrays", function(): void {
    const target = {
      arrays: {
        p1: ["T", 1, true, "T"],
        p2: ["T", 1, true, "T"]
      }
    };
    const source = deepFreeze({
      arrays: {
        p2: ["S", false, 0, "S"],
        p3: ["S", false, 0, "S"]
      }
    });

    const merged = deepExtend(target, source);

    expect(merged, "They should be the same instance.").to.equal(target);
    expect(
      merged,
      "Objects inheriting directly from Object should be deeply merged, arrays replaced."
    ).to.deep.equal({
      arrays: {
        p1: ["T", 1, true, "T"],
        p2: ["S", false, 0, "S"],
        p3: ["S", false, 0, "S"]
      }
    });

    expect(
      merged.arrays.p2,
      "Array should not be copied by reference."
    ).to.not.equal(source.arrays.p2);
    expect(
      merged.arrays.p2,
      "Array should not be copied by reference."
    ).to.not.equal(source.arrays.p2);
  });

  it("objects with other than Object prototype", function(): void {
    const objectLiteral = { p3: "S" };
    const objectFromNull = Object.create(null);
    const objectFromObject = Object.create(Object);
    const objectFromMap = new Map();

    const target = {
      objects: {
        objectLiteral: { p1: "T" }
      }
    };
    const source = deepFreeze({
      objects: {
        objectLiteral,
        objectFromNull,
        objectFromObject,
        objectFromMap
      }
    });

    const merged = deepExtend(target, source);

    expect(merged, "They should be the same instance.").to.equal(target);
    expect(
      merged,
      "Objects inheriting directly from Object should be deeply merged, other replaced."
    ).to.deep.equal({
      objects: {
        objectLiteral: {
          p1: "T",
          p3: "S"
        },
        objectFromNull: {},
        objectFromObject: {},
        objectFromMap: new Map()
      }
    });

    expect(
      merged.objects.objectLiteral,
      "Object literal should not be copied by reference."
    ).to.not.equal(source.objects.objectLiteral);
    expect(
      merged.objects.objectFromNull,
      "Object created from null should be copied by reference."
    ).to.equal(source.objects.objectFromNull);
    expect(
      merged.objects.objectFromObject,
      "Object created from null should be copied by reference."
    ).to.equal(source.objects.objectFromObject);
    expect(
      merged.objects.objectFromMap,
      "Object created from null should be copied by reference."
    ).to.equal(source.objects.objectFromMap);
  });

  describe("inherited properties", function(): void {
    it("ignored by default", function(): void {
      const target = {};
      const source = deepFreeze(
        Object.create(
          deepFreeze({
            inherited: "S"
          })
        )
      );

      const merged = deepExtend(target, source);

      expect(merged, "They should be the same instance.").to.equal(target);
      expect(
        merged,
        "Inherited properties shouldn’t be inherited by default."
      ).to.deep.equal({});
    });

    it("inherited if enabled", function(): void {
      const target = {};
      const source = deepFreeze(
        Object.create(
          deepFreeze({
            inherited: "S"
          })
        )
      );

      const merged = deepExtend(target, source, true);

      expect(merged, "They should be the same instance.").to.equal(target);
      expect(
        merged,
        "Inherited properties should be inherited when enabled."
      ).to.deep.equal({
        inherited: "S"
      });
    });
  });

  describe("deletion", function(): void {
    it("disabled", function(): void {
      const target = {
        p1: "p1 T",
        p2: "p2 T"
      };
      const source = deepFreeze({
        p2: null,
        p3: null
      });

      const merged = deepExtend(target, source);

      expect(merged, "They should be the same instance.").to.equal(target);
      expect(
        merged,
        "No properties should be deleted unless enabled."
      ).to.deep.equal({
        p1: "p1 T",
        p2: null,
        p3: null
      });
    });

    it("enabled", function(): void {
      const target = {
        p1: "p1 T",
        p2: "p2 T"
      };
      const source = deepFreeze({
        p2: null,
        p3: null
      });

      const merged = deepExtend(target, source, false, true);

      expect(merged, "They should be the same instance.").to.equal(target);
      expect(
        merged,
        "Null properties from the source should delete matching properties in the target."
      ).to.deep.equal({
        p1: "p1 T",
        p3: null // TODO: This seems wrong.
      });
    });
  });

  describe("edge cases", function(): void {
    it("constructor property", function(): void {
      const target = {
        object: {
          constructor: {
            p1: "T"
          }
        }
      };
      const source = deepFreeze({
        object: {
          constructor: {
            p3: "S"
          }
        }
      });

      const merged = deepExtend(target, source);

      expect(merged, "They should be the same instance.").to.equal(target);
      expect(
        merged,
        "All the properties should be deeply merged."
      ).to.deep.equal({
        object: {
          constructor: {
            p1: "T",
            p3: "S"
          }
        }
      });
    });
  });
});
