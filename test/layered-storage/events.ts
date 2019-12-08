import { LayeredStorage } from "../../src/layered-storage";
import { assert, spy } from "sinon";
import { deepFreeze } from "../helpers";

type KV = Record<string, number>;

export function events(): void {
  describe("Events", function(): void {
    deepFreeze([
      { name: "Single regex", keys: /^test\..*$/ },
      { name: "Single regex in an array", keys: [/^test\..*$/] },
      { name: "Literals", keys: ["test.value1", "test.value2", "test.value3"] },
      { name: "Two regexes", keys: [/^nonexistent$/, /^test\..*$/] },
      {
        name: "Regex that never passes and literals that do",
        keys: [/^nonexistent$/, "test.value1", "test.value2", "test.value3"]
      },
      {
        name: "Literals that never pass and regex that does",
        keys: ["nonexistent", /^test\..*$/]
      }
    ]).forEach(({ name, keys }): void => {
      describe(name, function(): void {
        it("Monolithic", function(): void {
          const ms = new LayeredStorage<KV, 1 | 4>();

          const msSpy = spy();

          ms.on(keys, msSpy);
          assert.notCalled(msSpy);

          ms.set(4, "other.value1", 7);
          assert.notCalled(msSpy);

          ms.set(1, "test.value1", 6);
          assert.callCount(msSpy, 1);
          assert.calledWithExactly(msSpy.lastCall, ["test.value1"]);

          ms.set(4, "test.value2", 5);
          assert.callCount(msSpy, 2);
          assert.calledWithExactly(msSpy.lastCall, ["test.value2"]);

          ms.delete(4, "test.value3");
          assert.callCount(msSpy, 3);
          assert.calledWithExactly(msSpy.lastCall, ["test.value3"]);

          ms.delete(1, "test.value1");
          assert.callCount(msSpy, 4);
          assert.calledWithExactly(msSpy.lastCall, ["test.value1"]);
        });

        it("Segmened", function(): void {
          const ms = new LayeredStorage<KV, 1 | 4>();
          const ss = ms.openSegment("a");

          const msSpy = spy();
          const ssSpy = spy();

          ms.on(keys, msSpy);
          ss.on(keys, ssSpy);
          assert.notCalled(msSpy);
          assert.notCalled(ssSpy);

          ms.set(4, "other.value1", 7);
          assert.notCalled(msSpy);
          assert.notCalled(ssSpy);

          ms.set(1, "test.value1", 6);
          assert.callCount(msSpy, 1);
          assert.callCount(ssSpy, 1);
          assert.calledWithExactly(msSpy.lastCall, ["test.value1"]);
          assert.calledWithExactly(ssSpy.lastCall, ["test.value1"]);

          ss.set(1, "test.value1", 6);
          assert.callCount(msSpy, 1);
          assert.callCount(ssSpy, 2);
          assert.calledWithExactly(ssSpy.lastCall, ["test.value1"]);

          ms.set(4, "test.value2", 5);
          assert.callCount(msSpy, 2);
          assert.callCount(ssSpy, 3);
          assert.calledWithExactly(msSpy.lastCall, ["test.value2"]);
          assert.calledWithExactly(ssSpy.lastCall, ["test.value2"]);

          ms.delete(4, "test.value3");
          assert.callCount(msSpy, 3);
          assert.callCount(ssSpy, 4);
          assert.calledWithExactly(msSpy.lastCall, ["test.value3"]);
          assert.calledWithExactly(ssSpy.lastCall, ["test.value3"]);

          ss.delete(4, "test.value2");
          assert.callCount(msSpy, 3);
          assert.callCount(ssSpy, 5);
          assert.calledWithExactly(ssSpy.lastCall, ["test.value2"]);

          ms.delete(1, "test.value1");
          assert.callCount(msSpy, 4);
          assert.callCount(ssSpy, 6);
          assert.calledWithExactly(msSpy.lastCall, ["test.value1"]);
          assert.calledWithExactly(ssSpy.lastCall, ["test.value1"]);
        });

        it("Monolithic transaction", function(): void {
          const ms = new LayeredStorage<KV, 1 | 4>();
          const ss = ms.openSegment("a");

          const msSpy = spy();
          const ssSpy = spy();

          ms.on(keys, msSpy);
          ss.on(keys, ssSpy);
          assert.notCalled(msSpy);
          assert.notCalled(ssSpy);

          ms.runTransaction((transaction): void => {
            transaction.set(4, "other.value1", 7);
            transaction.set(1, "test.value1", 6);
            transaction.set(4, "test.value2", 5);
            transaction.delete(4, "test.value3");
            transaction.delete(1, "test.value1");

            assert.notCalled(msSpy);
            assert.notCalled(ssSpy);
          });
          assert.callCount(msSpy, 1);
          assert.callCount(ssSpy, 1);
          assert.calledWithExactly(msSpy.lastCall, [
            "test.value1",
            "test.value2",
            "test.value3"
          ]);
          assert.calledWithExactly(ssSpy.lastCall, [
            "test.value1",
            "test.value2",
            "test.value3"
          ]);
        });

        it("Segmented transaction", function(): void {
          const ms = new LayeredStorage<KV, 1 | 4>();
          const ss = ms.openSegment("a");

          const msSpy = spy();
          const ssSpy = spy();

          ms.on(keys, msSpy);
          ss.on(keys, ssSpy);
          assert.notCalled(msSpy);
          assert.notCalled(ssSpy);

          ss.runTransaction((transaction): void => {
            transaction.set(4, "other.value1", 7);
            transaction.set(1, "test.value1", 6);
            transaction.set(4, "test.value2", 5);
            transaction.delete(4, "test.value3");
            transaction.delete(1, "test.value1");

            assert.notCalled(msSpy);
            assert.notCalled(ssSpy);
          });
          assert.callCount(msSpy, 0);
          assert.callCount(ssSpy, 1);
          assert.calledWithExactly(ssSpy.lastCall, [
            "test.value1",
            "test.value2",
            "test.value3"
          ]);
        });
      });
    });
  });
}
