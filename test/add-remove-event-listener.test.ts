import { assert, spy } from "sinon";
import { deepFreeze } from "./helpers";

import { addEventListener, removeEventListener } from "../src";

describe("*EventListener", function(): void {
  beforeEach((): void => {
    (global as any).navigator = {
      userAgent: "ECMAScript compliant browser"
    };
  });
  afterEach((): void => {
    delete (global as any).navigator;
  });

  const eventListener = deepFreeze((): void => {});
  [
    {
      method: "addEventListener" as const,
      methodIE: "attachEvent" as const,
      fn: addEventListener
    },
    {
      method: "removeEventListener" as const,
      methodIE: "detachEvent" as const,
      fn: removeEventListener
    }
  ].forEach(
    ({ method, methodIE, fn }): void => {
      describe(method, function(): void {
        describe("standard compliant", function(): void {
          it("without use capture", function(): void {
            const elem = {
              [method]: spy(),
              [methodIE]: spy()
            };

            fn((elem as unknown) as HTMLDivElement, "click", eventListener);

            assert.notCalled(elem[methodIE]);

            assert.calledOnce(elem[method]);
            assert.calledWithExactly(
              elem[method],
              "click",
              eventListener,
              false
            );
          });

          it("with use capture", function(): void {
            const elem = {
              [method]: spy(),
              [methodIE]: spy()
            };

            fn(
              (elem as unknown) as HTMLDivElement,
              "mousewheel",
              eventListener,
              true
            );

            assert.notCalled(elem[methodIE]);

            assert.calledOnce(elem[method]);
            assert.calledWithExactly(
              elem[method],
              "mousewheel",
              eventListener,
              true
            );
          });
        });

        describe("Firefox", function(): void {
          beforeEach((): void => {
            (global as any).navigator = {
              userAgent: "Firefox"
            };
          });
          afterEach((): void => {
            delete (global as any).navigator;
          });

          it("mousewheel event", function(): void {
            const elem = {
              [method]: spy(),
              [methodIE]: spy()
            };

            fn(
              (elem as unknown) as HTMLDivElement,
              "mousewheel",
              eventListener,
              true
            );

            assert.notCalled(elem[methodIE]);

            assert.calledOnce(elem[method]);
            assert.calledWithExactly(
              elem[method],
              "DOMMouseScroll",
              eventListener,
              true
            );
          });
        });

        it("IE", function(): void {
          const elem = {
            [methodIE]: spy()
          };

          fn((elem as unknown) as HTMLDivElement, "click", eventListener, true);

          assert.calledOnce(elem[methodIE]);
          assert.calledWithExactly(elem[methodIE], "onclick", eventListener);
        });
      });
    }
  );
});
