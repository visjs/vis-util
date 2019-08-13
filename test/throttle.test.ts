import { assert, spy } from "sinon";

import { throttle } from "../src";

describe("throttle", function(): void {
  const queue: ((str: string) => void)[] = [];
  const fire = (): void => {
    queue.splice(0).forEach((fn): void => {
      fn("This should never be seen in the throttled callback.");
    });
  };

  beforeEach((): void => {
    (global as any).requestAnimationFrame = queue.push.bind(queue);
  });
  afterEach((): void => {
    delete (global as any).requestAnimationFrame;
  });

  it("called on animation frame", function(): void {
    const throttleSpy = spy();
    const throttled = throttle(throttleSpy);

    throttled();

    assert.notCalled(throttleSpy);
    fire();
    assert.calledOnce(throttleSpy);
    assert.alwaysCalledWith(throttleSpy);
  });

  it("called only once", function(): void {
    const throttleSpy = spy();
    const throttled = throttle(throttleSpy);

    throttled();
    throttled();
    throttled();
    throttled();

    assert.notCalled(throttleSpy);
    fire();
    assert.calledOnce(throttleSpy);
    assert.alwaysCalledWith(throttleSpy);
  });

  it("called once on each animation frame", function(): void {
    const throttleSpy = spy();
    const throttled = throttle(throttleSpy);

    throttled();
    throttled();
    throttled();
    throttled();
    assert.notCalled(throttleSpy);

    throttled();
    throttled();
    fire();
    assert.calledOnce(throttleSpy);
    assert.alwaysCalledWith(throttleSpy);

    throttled();
    fire();
    assert.calledTwice(throttleSpy);
    assert.alwaysCalledWith(throttleSpy);

    throttled();
    throttled();
    throttled();
    fire();
    assert.calledThrice(throttleSpy);
    assert.alwaysCalledWith(throttleSpy);
  });

  it("called only if requested before the animation frame", function(): void {
    const throttleSpy = spy();
    const throttled = throttle(throttleSpy);

    throttled();
    throttled();
    assert.notCalled(throttleSpy);

    throttled();
    fire();
    assert.calledOnce(throttleSpy);
    assert.alwaysCalledWith(throttleSpy);

    fire();
    assert.calledOnce(throttleSpy);
    assert.alwaysCalledWith(throttleSpy);

    throttled();
    throttled();
    fire();
    assert.calledTwice(throttleSpy);
    assert.alwaysCalledWith(throttleSpy);
  });
});
