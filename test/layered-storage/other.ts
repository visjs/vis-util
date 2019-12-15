import { LayeredStorage } from "../../src/layered-storage";
import { expect } from "chai";

type KV = Record<string, number>;

/**
 * Other tests that don't fit elsewhere.
 */
export function other(): void {
  const getStructCount = (ls: LayeredStorage<KV, 1 | 4 | 9>): number =>
    [
      // Ignore private property access errors. It's no big deal since this
      // is a unit test.
      // @ts-ignore
      ...ls._core._data.values()
    ].reduce((acc, lData): number => {
      return (
        acc +
        1 +
        [...lData.values()].reduce((acc, sData): number => {
          return acc + 1 + sData.size;
        }, 0)
      );
    }, 0);

  it("Empty data structure purging", function(): void {
    const ls = new LayeredStorage<KV, 1 | 4 | 9>();

    ([1, 4, 9] as const).forEach((layer): void => {
      ls.set(layer, "test.value1", 1);
      ls.set(layer, "test.value2", 2);
      ["a", "b", "c"].forEach((segment): void => {
        ls.set(layer, segment, "test.value1", 1);
        ls.set(layer, segment, "test.value2", 2);
      });
    });

    expect(getStructCount(ls)).to.equal(
      3 + // layers
      3 * 4 + // 4 segments on each layer
        3 * 4 * 2 // 2 values in each segment
    );

    ([1, 4, 9] as const).forEach((layer): void => {
      ls.delete(layer, "test.value1");
      ["a", "b", "c"].forEach((segment): void => {
        ls.delete(layer, segment, "test.value1");
      });
    });

    expect(getStructCount(ls)).to.equal(
      3 + // layers
      3 * 4 + // 4 segments on each layer
        3 * 4 * 1 // 1 value in each segment
    );

    ([1, 4, 9] as const).forEach((layer): void => {
      ls.delete(layer, "test.value2");
      ["b"].forEach((segment): void => {
        ls.delete(layer, segment, "test.value2");
      });
    });

    expect(getStructCount(ls)).to.equal(
      3 + // layers
      3 * 2 + // 2 segments on each layer
        3 * 2 * 1 // 1 value in each segment
    );

    ([1, 4, 9] as const).forEach((layer): void => {
      ["a", "c"].forEach((segment): void => {
        ls.delete(layer, segment, "test.value2");
      });
    });

    expect(getStructCount(ls)).to.equal(
      0 // no layers, no segments, no values
    );
  });

  it("Empty data structure creation", function(): void {
    const ls = new LayeredStorage<KV, 1 | 4 | 9>();

    ls.set(4, "c", "test.value1", 1);

    ls.get("test.value1");
    ls.get("b", "test.value1");
    ls.has("test.value2");
    ls.has("a", "test.value2");

    expect(getStructCount(ls)).to.equal(
      3 // 1 layer, 1 segment, 1 value
    );
  });
}
