import { LayeredStorage } from "../../src/layered-storage";
import { expect } from "chai";

interface KV {
  "test.value": string;
  "test.value1": string;
  "test.value2": string;
  "test.value3": string;
  "test.value4": string;
  "test.value5": string;
  "test.value6": string;
  "test.value7": string;
  "unrelated.value": string;
}

/**
 * Test that segments inherit from other segments.
 */
export function inheritance(): void {
  describe("Inheritance", function (): void {
    const a = Symbol("A");
    const b = Symbol("B");
    const c = Symbol("C");
    const d = Symbol("D");
    const e = Symbol("E");
    const f = Symbol("F");

    it("Default inheritance", function (): void {
      const ls = new LayeredStorage<7, KV, KV>();

      ls.global.set(7, "test.value", "global");
      ls.openSegment(a).set(7, "test.value", "A");
      ls.openSegment(b).set(7, "test.value", "B");

      expect(
        ls.openSegment(c).get("test.value"),
        "By default segments should inherit from the global segment"
      ).to.equal("global");
    });

    it("Disable global inheritance", function (): void {
      const ls = new LayeredStorage<7, KV, KV>();

      ls.global.set(7, "test.value", "global");
      ls.openSegment(a).set(7, "test.value", "A");
      ls.openSegment(b).set(7, "test.value", "B");
      ls.openSegment(c).setInheritance([], false);

      expect(
        ls.openSegment(c).has("test.value"),
        "Nothing should be inherited if inheritance chain is empty and global disabled"
      ).to.be.false;
    });

    it("Other segment without global", function (): void {
      const ls = new LayeredStorage<3 | 7, KV, KV>();

      ls.global.set(7, "test.value", "global");
      ls.openSegment(a).set(7, "test.value", "A");
      ls.openSegment(b).set(7, "test.value", "B");
      ls.openSegment(c).setInheritance([a], false);

      expect(
        ls.openSegment(c).get("test.value"),
        "The value should be inherited from A since C has none of it's own and global inheritance (even though global has higher priority in this case) is disabled"
      ).to.equal("A");
    });

    it("Other segment with global", function (): void {
      const ls = new LayeredStorage<3 | 7, KV, KV>();

      ls.global.set(7, "test.value", "global");
      ls.openSegment(a).set(3, "test.value", "A");
      ls.openSegment(b).set(7, "test.value", "B");
      ls.openSegment(c).setInheritance([a]);

      expect(
        ls.openSegment(c).get("test.value"),
        "The value should be inherited from global since C has none of it's own (A has lower priority than global)"
      ).to.equal("global");
    });

    it("Multiple inheritance", function (): void {
      const ls = new LayeredStorage<3 | 7, KV, KV>();

      ls.openSegment(f).setInheritance([e, d, c, b, a]);

      ls.global.set(7, "test.value1", "global");
      ls.openSegment(a).set(7, "test.value1", "A");
      ls.openSegment(b).set(7, "test.value1", "B");
      ls.openSegment(c).set(7, "test.value1", "C");
      ls.openSegment(d).set(7, "test.value1", "D");
      ls.openSegment(e).set(7, "test.value1", "E");
      ls.openSegment(f).set(7, "test.value1", "F");

      ls.global.set(7, "test.value2", "global");
      ls.openSegment(a).set(7, "test.value2", "A");
      ls.openSegment(b).set(7, "test.value2", "B");
      ls.openSegment(c).set(7, "test.value2", "C");
      ls.openSegment(d).set(7, "test.value2", "D");
      ls.openSegment(e).set(7, "test.value2", "E");

      ls.global.set(7, "test.value3", "global");
      ls.openSegment(a).set(7, "test.value3", "A");
      ls.openSegment(b).set(7, "test.value3", "B");
      ls.openSegment(c).set(7, "test.value3", "C");
      ls.openSegment(d).set(7, "test.value3", "D");

      ls.global.set(7, "test.value4", "global");
      ls.openSegment(a).set(7, "test.value4", "A");
      ls.openSegment(b).set(7, "test.value4", "B");
      ls.openSegment(c).set(7, "test.value4", "C");

      ls.global.set(7, "test.value5", "global");
      ls.openSegment(a).set(7, "test.value5", "A");
      ls.openSegment(b).set(7, "test.value5", "B");

      ls.global.set(7, "test.value6", "global");
      ls.openSegment(a).set(7, "test.value6", "A");

      ls.global.set(7, "test.value7", "global");

      expect(ls.openSegment(f).get("test.value1")).to.equal("F");
      expect(ls.openSegment(f).get("test.value2")).to.equal("E");
      expect(ls.openSegment(f).get("test.value3")).to.equal("D");
      expect(ls.openSegment(f).get("test.value4")).to.equal("C");
      expect(ls.openSegment(f).get("test.value5")).to.equal("B");
      expect(ls.openSegment(f).get("test.value6")).to.equal("A");
      expect(ls.openSegment(f).get("test.value7")).to.equal("global");
    });

    it("Change inheritance", function (): void {
      const ls = new LayeredStorage<3 | 7, KV, KV>();

      ls.global.set(7, "test.value", "global");
      ls.openSegment(a).set(7, "test.value", "A");
      ls.openSegment(b).set(7, "test.value", "B");

      expect(
        ls.openSegment(c).get("test.value"),
        "C should follow default inheritance rules"
      ).to.equal("global");

      ls.openSegment(c).setInheritance([a, b]);

      expect(
        ls.openSegment(c).get("test.value"),
        "C should inherit from A then B then global"
      ).to.equal("A");

      ls.openSegment(c).setInheritance([b]);

      expect(
        ls.openSegment(c).get("test.value"),
        "C should inherit from B then global"
      ).to.equal("B");

      ls.openSegment(c).setInheritance([]);

      expect(
        ls.openSegment(c).get("test.value"),
        "C should inherit from global"
      ).to.equal("global");

      ls.openSegment(c).setInheritance([], false);

      expect(ls.openSegment(c).has("test.value"), "C should not inherit at all")
        .to.be.false;
    });
  });
}
