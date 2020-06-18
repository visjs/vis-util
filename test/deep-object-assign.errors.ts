import { Assignable, DELETE, deepObjectAssign } from "../src";

interface TestObject {
  string?: string;
  number?: number;
  array?: number[];
  object?: {
    string?: string;
    number?: number;
    array?: number[];
  };
  required: {
    demanded: string;
  };
}

const testObject: TestObject = {} as any;

let assignableTestObject: Assignable<TestObject> = {} as any;
assignableTestObject = assignableTestObject ?? {};

// It shouldn't be possible to use anything but TestObject as the target.
deepObjectAssign<TestObject>(
  // THROWS Argument of type
  {}
);

// It shouldn't be possible to use Assignable<TestObject> as the target.
deepObjectAssign<TestObject>(
  // THROWS Argument of type
  assignableTestObject
);

deepObjectAssign<TestObject>(
  testObject,
  // It should be possible to assign the original object.
  testObject,
  // It should be possible to assign Assignable<TestObject>.
  assignableTestObject
);

// It should be possible to replace optional values with DELETE.
deepObjectAssign<TestObject>(testObject, {
  string: DELETE,
  number: DELETE,
  array: DELETE,
  object: {
    string: DELETE,
    number: DELETE,
    array: DELETE,
  },
});

// It shouldn't be possible to replace required values with DELETE.
deepObjectAssign<TestObject>(testObject, {
  required: {
    // THROWS Type 'symbol' is not assignable to type
    demanded: DELETE,
  },
});
deepObjectAssign<TestObject>(testObject, {
  // THROWS Type 'symbol' is not assignable to type
  required: DELETE,
});

// It should be possible to replace whole optional objects with DELETE.
deepObjectAssign<TestObject>(testObject, {
  string: DELETE,
  number: DELETE,
  array: DELETE,
  object: DELETE,
});

// It should be possible to omit properties.
deepObjectAssign<TestObject>(testObject, {
  string: DELETE,
  object: {
    array: DELETE,
  },
});
deepObjectAssign<TestObject>(testObject, {
  array: DELETE,
  object: DELETE,
});
deepObjectAssign<TestObject>(testObject, {
  array: DELETE,
});
deepObjectAssign<TestObject>(testObject, {});
