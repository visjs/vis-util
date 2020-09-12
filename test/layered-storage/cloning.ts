import {
  LayeredStorage,
  LayeredStorageSegment,
} from "../../src/layered-storage";
import { expect } from "chai";

interface KV {
  test: number;
}

/**
 * Test that segments can be cloned.
 */
export function cloning(): void {
  describe("Cloning", function (): void {
    const configs: {
      name: string;
      clone(
        ls: LayeredStorage<0 | 1 | 2, KV, KV>,
        s1: LayeredStorageSegment<0 | 1 | 2, KV, KV>
      ): LayeredStorageSegment<0 | 1 | 2, KV, KV>;
    }[] = [
      {
        name: "From main instance",
        clone: (ls): LayeredStorageSegment<0 | 1 | 2, KV, KV> =>
          ls.cloneSegment(1, 2),
      },
      {
        name: "From segment instance",
        clone: (_ls, s1): LayeredStorageSegment<0 | 1 | 2, KV, KV> =>
          s1.cloneSegment(2),
      },
    ];

    configs.forEach(({ name, clone }): void => {
      it(name, function (): void {
        const ls = new LayeredStorage<0 | 1 | 2, KV, KV>();

        const s1 = ls.openSegment(1);

        s1.set(0, "test", 0);
        s1.set(1, "test", 1);
        s1.set(2, "test", 2);

        const s2 = clone(ls, s1);

        expect(
          s2.get("test"),
          "The cloned segment should be initialized with the original's values."
        ).to.equal(2);

        s2.set(1, "test", 11);

        expect(
          s2.get("test"),
          "The cloned segment should be initialized with the original's values on all layers."
        ).to.equal(2);

        s2.delete(2, "test");

        expect(
          s2.get("test"),
          "It should be possible to modify the cloned segment."
        ).to.equal(11);

        expect(
          s1.get("test"),
          "The original segment should be unaffected."
        ).to.equal(2);
      });
    });

    it("Cloning into existing segment", function (): void {
      const ls = new LayeredStorage<1, KV, KV>();

      const s1 = ls.openSegment(1);
      const s2 = ls.openSegment(2);

      s1.set(1, "test", 1);
      s2.set(1, "test", 2);

      expect((): void => {
        s1.cloneSegment(2);
      }, "It shouldn't be possible to overwrite a segment by cloning.").to.throw();

      expect((): void => {
        ls.cloneSegment(1, 2);
      }, "It shouldn't be possible to overwrite a segment by cloning.").to.throw();
    });
  });
}
