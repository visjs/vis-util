import { LayeredStorage } from "../../src/layered-storage";
import { expect } from "chai";

type KV = Record<string, number>;

/**
 * Other tests that don't fit elsewhere.
 */
export function other(): void {
  const getStructCount = (
    ls: LayeredStorage<1 | 4 | 9, KV, keyof KV>
  ): number =>
    [
      // Ignore private property access errors. It's no big deal since this
      // is a unit test.
      // @ts-ignore
      ...ls._core._data.values(),
    ].reduce((acc, lData): number => {
      return (
        acc +
        1 +
        [...lData.values()].reduce((acc, sData): number => {
          return acc + 1 + sData.size;
        }, 0)
      );
    }, 0);

  const getCacheSize = (ls: LayeredStorage<1 | 4 | 9, KV, keyof KV>): number =>
    // Ignore private property access errors. It's no big deal since this
    // is a unit test.
    // @ts-ignore
    ls._core._topLevelCache.size;

  it("Empty data structure purging", function (): void {
    const ls = new LayeredStorage<1 | 4 | 9, KV, keyof KV>();

    ([1, 4, 9] as const).forEach((layer): void => {
      ls.global.set(layer, "test.value1", 1);
      ls.global.set(layer, "test.value2", 2);
      ["a", "b", "c"].forEach((segment): void => {
        ls.openSegment(segment).set(layer, "test.value1", 1);
        ls.openSegment(segment).set(layer, "test.value2", 2);
      });
    });

    expect(getStructCount(ls)).to.equal(
      3 + // layers
      3 * 4 + // 4 segments on each layer
        3 * 4 * 2 // 2 values in each segment
    );

    ([1, 4, 9] as const).forEach((layer): void => {
      ls.global.delete(layer, "test.value1");
      ["a", "b", "c"].forEach((segment): void => {
        ls.openSegment(segment).delete(layer, "test.value1");
      });
    });

    expect(getStructCount(ls)).to.equal(
      3 + // layers
      3 * 4 + // 4 segments on each layer
        3 * 4 * 1 // 1 value in each segment
    );

    ([1, 4, 9] as const).forEach((layer): void => {
      ls.global.delete(layer, "test.value2");
      ["b"].forEach((segment): void => {
        ls.openSegment(segment).delete(layer, "test.value2");
      });
    });

    expect(getStructCount(ls)).to.equal(
      3 + // layers
      3 * 2 + // 2 segments on each layer
        3 * 2 * 1 // 1 value in each segment
    );

    ([1, 4, 9] as const).forEach((layer): void => {
      ["a", "c"].forEach((segment): void => {
        ls.openSegment(segment).delete(layer, "test.value2");
      });
    });

    expect(getStructCount(ls)).to.equal(
      0 // no layers, no segments, no values
    );
  });

  it("Cache purging", function (): void {
    const ls = new LayeredStorage<1, KV, keyof KV>();

    expect(getCacheSize(ls)).to.equal(0);

    ls.global.set(1, "test.value1", 7);
    ls.openSegment("a").set(1, "test.value1", 7);
    ls.openSegment("b").set(1, "test.value1", 7);
    ls.openSegment("c").set(1, "test.value1", 7);

    expect(getCacheSize(ls)).to.equal(0);

    ls.global.get("test.value1");
    ls.openSegment("a").get("test.value1");
    ls.openSegment("b").get("test.value1");
    ls.openSegment("c").get("test.value1");
    ls.global.get("test.value2");
    ls.openSegment("a").get("test.value2");
    ls.openSegment("b").get("test.value2");
    ls.openSegment("c").get("test.value2");

    expect(getCacheSize(ls)).to.equal(4);

    ls.global.set(1, "test.value1", 7);
    ls.openSegment("a").set(1, "test.value1", 7);
    ls.openSegment("b").set(1, "test.value1", 7);
    ls.openSegment("c").set(1, "test.value1", 7);

    expect(getCacheSize(ls)).to.equal(4);

    ls.global.set(1, "test.value2", 7);

    expect(getCacheSize(ls)).to.equal(0);
  });

  it("Empty data structure creation", function (): void {
    const ls = new LayeredStorage<1 | 4 | 9, KV, keyof KV>();

    ls.openSegment("c").set(4, "test.value1", 1);

    ls.global.get("test.value1");
    ls.openSegment("b").get("test.value1");
    ls.global.has("test.value2");
    ls.openSegment("a").has("test.value2");

    expect(getStructCount(ls)).to.equal(
      3 // 1 layer, 1 segment, 1 value
    );
  });

  it("Segment storage reports it's segment", function (): void {
    const ls = new LayeredStorage<1 | 4 | 9, KV, keyof KV>();

    expect(
      ls.openSegment("$"),
      "Each segment should exposes a property with the name of the segment."
    )
      .have.ownProperty("segment")
      .that.equals("$");
  });
}
