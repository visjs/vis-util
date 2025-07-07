import jsdom_global from "jsdom-global";
import assert, { throws, equal } from "assert";

import {
  fillIfDefined,
  selectiveDeepExtend,
  selectiveNotDeepExtend,
  deepExtend,
  mergeOptions,
  recursiveDOMDelete,
  isDate,
  getType,
  easingFunctions,
  getScrollBarWidth,
  equalArray,
  option,
  binarySearchValue,
} from "../src/index.ts";

describe("util", function () {
  /**
   * Tests for copy and extend methods.
   *
   * Goal: to cover all possible paths within the tested method(s)
   * @remarks
   * - All these methods have the inherent flaw that it's possible to define
   * properties on an object with value 'undefined'. e.g. in `node`:
   *
   * > a = { b:undefined }
   * > a.hasOwnProperty('b')
   * true
   *
   * The logic for handling this in the code is minimal and accidental. For the time being,
   * this flaw is ignored.
   */
  describe("extend routines", function () {
    /*
     * Check if values have been copied over from b to a as intended
     */
    function checkExtended(a, b, checkCopyTarget = false) {
      var result = {
        color: "green",
        sub: {
          enabled: false,
          sub2: {
            font: "awesome",
          },
        },
      };

      assert(a.color !== undefined && a.color === result.color);
      assert(a.notInSource === true);
      if (checkCopyTarget) {
        assert(a.notInTarget === true);
      } else {
        assert(a.notInTarget === undefined);
      }

      var sub = a.sub;
      assert(sub !== undefined);
      assert(sub.enabled !== undefined && sub.enabled === result.sub.enabled);
      assert(sub.notInSource === true);
      if (checkCopyTarget) {
        assert(sub.notInTarget === true);
      } else {
        assert(sub.notInTarget === undefined);
      }

      sub = a.sub.sub2;
      assert(sub !== undefined);
      assert(
        sub !== undefined &&
          sub.font !== undefined &&
          sub.font === result.sub.sub2.font,
      );
      assert(sub.notInSource === true);
      assert(a.subNotInSource !== undefined);
      if (checkCopyTarget) {
        assert(a.subNotInTarget.enabled === true);
        assert(sub.notInTarget === true);
      } else {
        assert(a.subNotInTarget === undefined);
        assert(sub.notInTarget === undefined);
      }
    }

    /*
     * Spot check on values of a unchanged as intended
     */
    function testAUnchanged(a) {
      var sub = a.sub;
      assert(sub !== undefined);
      assert(sub.enabled !== undefined && sub.enabled === true);
      assert(sub.notInSource === true);
      assert(sub.notInTarget === undefined);
      assert(sub.deleteThis === true);

      sub = a.sub.sub2;
      assert(sub !== undefined);
      assert(
        sub !== undefined && sub.font !== undefined && sub.font === "arial",
      );
      assert(sub.notInSource === true);
      assert(sub.notInTarget === undefined);

      assert(a.subNotInSource !== undefined);
      assert(a.subNotInTarget === undefined);
    }

    function initA() {
      return {
        color: "red",
        notInSource: true,
        sub: {
          enabled: true,
          notInSource: true,
          sub2: {
            font: "arial",
            notInSource: true,
          },
          deleteThis: true,
        },
        subNotInSource: {
          enabled: true,
        },
        deleteThis: true,
        subDeleteThis: {
          enabled: true,
        },
      };
    }

    beforeEach(function () {
      this.a = initA();

      this.b = {
        color: "green",
        notInTarget: true,
        sub: {
          enabled: false,
          notInTarget: true,
          sub2: {
            font: "awesome",
            notInTarget: true,
          },
          deleteThis: null,
        },
        subNotInTarget: {
          enabled: true,
        },
        deleteThis: null,
        subDeleteThis: null,
      };
    });

    it("performs fillIfDefined() as advertized", function () {
      var a = this.a;
      var b = this.b;

      fillIfDefined(a, b);
      checkExtended(a, b);

      // NOTE: if allowDeletion === false, null values are copied over!
      //       This is due to existing logic; it might not be the intention and hence a bug
      assert(a.sub.deleteThis === null);
      assert(a.deleteThis === null);
      assert(a.subDeleteThis === null);
    });

    it("performs fillIfDefined() as advertized with deletion", function () {
      var a = this.a;
      var b = this.b;

      fillIfDefined(a, b, true); //  thrid param: allowDeletion
      checkExtended(a, b);

      // Following should be removed now
      assert(a.sub.deleteThis === undefined);
      assert(a.deleteThis === undefined);
      assert(a.subDeleteThis === undefined);
    });

    it("performs selectiveDeepExtend() as advertized", function () {
      var a = this.a;
      var b = this.b;

      // pedantic: copy nothing
      selectiveDeepExtend([], a, b);
      assert(a.color !== undefined && a.color === "red");
      assert(a.notInSource === true);
      assert(a.notInTarget === undefined);

      // pedantic: copy nonexistent property (nothing happens)
      assert(b.iDontExist === undefined);
      selectiveDeepExtend(["iDontExist"], a, b, true);
      assert(a.iDontExist === undefined);

      // At this point nothing should have changed yet.
      testAUnchanged(a);

      // Copy one property
      selectiveDeepExtend(["color"], a, b);
      assert(a.color !== undefined && a.color === "green");

      // Copy property Object
      var sub = a.sub;
      assert(sub.deleteThis === true); // pre
      selectiveDeepExtend(["sub"], a, b);
      assert(sub !== undefined);
      assert(sub.enabled !== undefined && sub.enabled === false);
      assert(sub.notInSource === true);
      assert(sub.notInTarget === true);
      assert(sub.deleteThis === null);

      // Copy new Objects
      assert(a.notInTarget === undefined); // pre
      assert(a.subNotInTarget === undefined); // pre
      selectiveDeepExtend(["notInTarget", "subNotInTarget"], a, b);
      assert(a.notInTarget === true);
      assert(a.subNotInTarget.enabled === true);

      // Copy null objects
      assert(a.deleteThis !== null); // pre
      assert(a.subDeleteThis !== null); // pre
      selectiveDeepExtend(["deleteThis", "subDeleteThis"], a, b);

      // NOTE: if allowDeletion === false, null values are copied over!
      //       This is due to existing logic; it might not be the intention and hence a bug
      assert(a.deleteThis === null);
      assert(a.subDeleteThis === null);
    });

    it("performs selectiveDeepExtend() as advertized with deletion", function () {
      var a = this.a;
      var b = this.b;

      // Only test expected differences here with test allowDeletion === false

      // Copy object property with properties to be deleted
      var sub = a.sub;
      assert(sub.deleteThis === true); // pre
      selectiveDeepExtend(["sub"], a, b, true);
      assert(sub.deleteThis === undefined); // should be deleted

      // Spot check on rest of properties in `a.sub` - there should have been copied
      sub = a.sub;
      assert(sub !== undefined);
      assert(sub.enabled !== undefined && sub.enabled === false);
      assert(sub.notInSource === true);
      assert(sub.notInTarget === true);

      // Copy null objects
      assert(a.deleteThis === true); // pre
      assert(a.subDeleteThis !== undefined); // pre
      assert(a.subDeleteThis.enabled === true); // pre
      selectiveDeepExtend(["deleteThis", "subDeleteThis"], a, b, true);
      assert(a.deleteThis === undefined); // should be deleted
      assert(a.subDeleteThis === undefined); // should be deleted
    });

    it("performs selectiveNotDeepExtend() as advertized", function () {
      var a = this.a;
      var b = this.b;

      // Exclude all properties, nothing copied
      selectiveNotDeepExtend(Object.keys(b), a, b);
      testAUnchanged(a);

      // Exclude nothing, everything copied
      selectiveNotDeepExtend([], a, b);
      checkExtended(a, b, true);

      // Exclude some
      a = initA();
      assert(a.notInTarget === undefined); // pre
      assert(a.subNotInTarget === undefined); // pre
      selectiveNotDeepExtend(["notInTarget", "subNotInTarget"], a, b);
      assert(a.notInTarget === undefined); // not copied
      assert(a.subNotInTarget === undefined); // not copied
      assert(a.sub.notInTarget === true); // copied!
    });

    it("performs selectiveNotDeepExtend() as advertized with deletion", function () {
      var a = this.a;
      var b = this.b;

      // Exclude all properties, nothing copied
      selectiveNotDeepExtend(Object.keys(b), a, b, true);
      testAUnchanged(a);

      // Exclude nothing, everything copied and some deleted
      selectiveNotDeepExtend([], a, b, true);
      checkExtended(a, b, true);

      // Exclude some
      a = initA();
      assert(a.notInTarget === undefined); // pre
      assert(a.subNotInTarget === undefined); // pre
      assert(a.deleteThis === true); // pre
      assert(a.subDeleteThis !== undefined); // pre
      assert(a.sub.deleteThis === true); // pre
      assert(a.subDeleteThis.enabled === true); // pre
      selectiveNotDeepExtend(["notInTarget", "subNotInTarget"], a, b, true);
      assert(a.deleteThis === undefined); // should be deleted
      assert(a.sub.deleteThis !== undefined); // not deleted! Original logic, could be a bug
      assert(a.subDeleteThis === undefined); // should be deleted
      // Spot check: following should be same as allowDeletion === false
      assert(a.notInTarget === undefined); // not copied
      assert(a.subNotInTarget === undefined); // not copied
      assert(a.sub.notInTarget === true); // copied!
    });

    /**
     * NOTE: parameter `protoExtend` not tested here!
     */
    it("performs deepExtend() as advertized", function () {
      var a = this.a;
      var b = this.b;

      deepExtend(a, b);
      checkExtended(a, b, true);
    });

    /**
     * NOTE: parameter `protoExtend` not tested here!
     */
    it("performs deepExtend() as advertized with delete", function () {
      var a = this.a;
      var b = this.b;

      // Copy null objects
      assert(a.deleteThis === true); // pre
      assert(a.subDeleteThis !== undefined); // pre
      assert(a.subDeleteThis.enabled === true); // pre
      deepExtend(a, b, false, true);
      checkExtended(a, b, true); // Normal copy should be good
      assert(a.deleteThis === undefined); // should be deleted
      assert(a.subDeleteThis === undefined); // should be deleted
      assert(a.sub.deleteThis !== undefined); // not deleted!!! Original logic, could be a bug
    });
  }); // extend routines

  //
  // The important thing with mergeOptions() is that 'enabled' is always set in target option.
  //
  describe("mergeOptions", function () {
    it("handles good input without global options", function () {
      var options = {
        someValue: "silly value",
        aBoolOption: false,
        anObject: {
          answer: 42,
        },
        anotherObject: {
          enabled: false,
        },
        merge: null,
      };

      // Case with empty target
      var mergeTarget = {};

      mergeOptions(mergeTarget, options, "someValue");
      assert(
        mergeTarget.someValue === undefined,
        "Non-object option should not be copied",
      );
      assert(mergeTarget.anObject === undefined);

      mergeOptions(mergeTarget, options, "aBoolOption");
      assert(
        mergeTarget.aBoolOption !== undefined,
        "option aBoolOption should now be an object",
      );
      assert(
        mergeTarget.aBoolOption.enabled === false,
        "enabled value option aBoolOption should have been copied into object",
      );

      mergeOptions(mergeTarget, options, "anObject");
      assert(mergeTarget.anObject !== undefined, "Option object is not copied");
      assert(mergeTarget.anObject.answer === 42);
      assert(mergeTarget.anObject.enabled === true);

      mergeOptions(mergeTarget, options, "anotherObject");
      assert(
        mergeTarget.anotherObject.enabled === false,
        "enabled value from options must have priority",
      );

      mergeOptions(mergeTarget, options, "merge");
      assert(
        mergeTarget.merge === undefined,
        "Explicit null option should not be copied, there is no global option for it",
      );

      // Case with non-empty target
      mergeTarget = {
        someValue: false,
        aBoolOption: true,
        anObject: {
          answer: 49,
        },
        anotherObject: {
          enabled: true,
        },
        merge: "hello",
      };

      mergeOptions(mergeTarget, options, "someValue");
      assert(
        mergeTarget.someValue === false,
        "Non-object option should not be copied",
      );
      assert(
        mergeTarget.anObject.answer === 49,
        "Sibling option should not be changed",
      );

      mergeOptions(mergeTarget, options, "aBoolOption");
      assert(
        mergeTarget.aBoolOption !== true,
        "option enabled should have been overwritten",
      );
      assert(
        mergeTarget.aBoolOption.enabled === false,
        "enabled value option aBoolOption should have been copied into object",
      );

      mergeOptions(mergeTarget, options, "anObject");
      assert(mergeTarget.anObject.answer === 42);
      assert(mergeTarget.anObject.enabled === true);

      mergeOptions(mergeTarget, options, "anotherObject");
      assert(
        mergeTarget.anotherObject !== undefined,
        "Option object is not copied",
      );
      assert(
        mergeTarget.anotherObject.enabled === false,
        "enabled value from options must have priority",
      );

      mergeOptions(mergeTarget, options, "merge");
      assert(
        mergeTarget.merge === "hello",
        "Explicit null-option should not be copied, already present in target",
      );
    });

    it("gracefully handles bad input", function () {
      var mergeTarget = {};
      var options = {
        merge: null,
      };

      var errMsg = "Non-object parameters should not be accepted";
      throws(() => mergeOptions(null, options, "anything"), Error, errMsg);
      throws(() => mergeOptions(undefined, options, "anything"), Error, errMsg);
      throws(() => mergeOptions(42, options, "anything"), Error, errMsg);
      throws(() => mergeOptions(mergeTarget, null, "anything"), Error, errMsg);
      throws(
        () => mergeOptions(mergeTarget, undefined, "anything"),
        Error,
        errMsg,
      );
      throws(() => mergeOptions(mergeTarget, 42, "anything"), Error, errMsg);
      throws(() => mergeOptions(mergeTarget, options, null), Error, errMsg);
      throws(
        () => mergeOptions(mergeTarget, options, undefined),
        Error,
        errMsg,
      );
      throws(
        () => mergeOptions(mergeTarget, options, "anything", null),
        Error,
        errMsg,
      );
      throws(
        () => mergeOptions(mergeTarget, options, "anything", "not an object"),
        Error,
        errMsg,
      );

      mergeOptions(mergeTarget, options, "iDontExist");
      assert(mergeTarget.iDontExist === undefined);
    });

    it("handles good input with global options", function () {
      var mergeTarget = {};
      var options = {
        merge: null,
        missingEnabled: {
          answer: 42,
        },
        alsoMissingEnabled: {
          // has no enabled in globals
          answer: 42,
        },
      };

      var globalOptions = {
        merge: {
          enabled: false,
        },
        missingEnabled: {
          enabled: false,
        },
      };

      mergeOptions(mergeTarget, options, "merge", globalOptions);
      assert(
        mergeTarget.merge.enabled === false,
        "null-option should create an empty target object",
      );

      mergeOptions(mergeTarget, options, "missingEnabled", globalOptions);
      assert(mergeTarget.missingEnabled.enabled === false);

      mergeOptions(mergeTarget, options, "alsoMissingEnabled", globalOptions);
      assert(mergeTarget.alsoMissingEnabled.enabled === true);
    });
  }); // mergeOptions

  describe("recursiveDOMDelete", function () {
    beforeEach(function () {
      this.timeout(10000);
      this.jsdom_global = jsdom_global();
    });

    afterEach(function () {
      this.jsdom_global();
    });

    it("removes children", function () {
      var root = document.createElement("div");
      // Create children for root
      var parent = document.createElement("div");
      var parentSibiling = document.createElement("div");
      // Attach parents to root
      root.appendChild(parent);
      root.appendChild(parentSibiling);
      // Create children for the respective parents
      var child = document.createElement("div");
      var childSibling = document.createElement("div");
      // Attach children to parents
      parent.appendChild(child);
      parentSibiling.appendChild(childSibling);

      recursiveDOMDelete(root);
      equal(root.children.length, 0);
      equal(parent.children.length, 0);
      equal(parentSibiling.children.length, 0);
      equal(child.children.length, 0);
      equal(childSibling.children.length, 0);
    });
  });

  describe("isDate", function () {
    it("identifies a Date", function () {
      assert(isDate(new Date()));
    });

    it("identifies an ASPDate as String", function () {
      assert(isDate("Date(1198908717056)"));
    });

    it("identifies a date string", function () {
      assert(isDate("1995-01-01"));
    });

    it("identifies a date string", function () {
      equal(isDate(""), false);
    });

    it("identifies non-dates", function () {
      equal(isDate(null), false);
      equal(isDate(undefined), false);
      equal(isDate([1, 2, 3]), false);
      equal(isDate({ a: 42 }), false);
      equal(isDate(42), false);
      equal(isDate("meow"), false);
    });
  });

  describe("getType", function () {
    it("of object null is null", function () {
      equal(getType(null), "null");
    });

    it("of object Boolean is Boolean", function () {
      function Tester() {}
      Tester.prototype = Object.create(Boolean.prototype);
      equal(getType(new Tester("true")), "Boolean");
    });

    it("of object Number is Number", function () {
      function Tester() {}
      Tester.prototype = Object.create(Number.prototype);
      equal(getType(new Tester(1)), "Number");
    });

    it("of object String is String", function () {
      function Tester() {}
      Tester.prototype = Object.create(String.prototype);
      equal(getType(new Tester("stringy!")), "String");
    });

    it("of object Array is Array", function () {
      equal(getType(new Array([])), "Array");
    });

    it("of object Date is Date", function () {
      equal(getType(new Date()), "Date");
    });

    it("of object any other type is Object", function () {
      equal(getType({}), "Object");
    });

    it("of number is Number", function () {
      equal(getType(1), "Number");
    });

    it("of boolean is Boolean", function () {
      equal(getType(true), "Boolean");
    });

    it("of string is String", function () {
      equal(getType("string"), "String");
    });

    it("of undefined is undefined", function () {
      equal(getType(), "undefined");
    });
  });

  describe("easingFunctions", function () {
    it("take a number and output a number", function () {
      for (var key in easingFunctions) {
        if (Object.prototype.hasOwnProperty.call(easingFunctions, key)) {
          equal(typeof easingFunctions[key](1), "number");
          equal(typeof easingFunctions[key](0.2), "number");
        }
      }
    });
  });

  describe("getScrollBarWidth", function () {
    beforeEach(function () {
      this.timeout(10000);
      this.jsdom_global = jsdom_global();
    });

    afterEach(function () {
      this.jsdom_global();
    });

    it("returns 0 when there is no content", function () {
      equal(getScrollBarWidth(), 0);
    });
  });

  describe("equalArray", function () {
    it("arrays of different lengths are not equal", function () {
      equal(equalArray([1, 2, 3], [1, 2]), false);
    });

    it("arrays with different content are not equal", function () {
      equal(equalArray([1, 2, 3], [3, 2, 1]), false);
    });

    it("same content arrays are equal", function () {
      assert(equalArray([1, 2, 3], [1, 2, 3]));
    });

    it("empty arrays are equal", function () {
      assert(equalArray([], []));
    });

    it("the same array is equal", function () {
      var arr = [1, 2, 3];
      assert(equalArray(arr, arr));
    });
  });

  describe("asBoolean", function () {
    it("resolves value from a function", function () {
      assert(
        option.asBoolean(function () {
          return true;
        }, false),
      );
    });

    it("returns default value for null", function () {
      assert(option.asBoolean(null, true));
    });

    it("returns true for other types", function () {
      assert(option.asBoolean("should be true", false));
    });

    it("returns null for undefined", function () {
      equal(option.asBoolean(), null);
    });
  });

  describe("asNumber", function () {
    it("resolves value from a function", function () {
      equal(
        option.asNumber(function () {
          return 777;
        }, 13),
        777,
      );
    });

    it("returns default value for null", function () {
      equal(option.asNumber(null, 13), 13);
    });

    it("returns number for other types", function () {
      equal(option.asNumber("777", 13), 777);
    });

    it("returns default for NaN", function () {
      equal(option.asNumber(NaN, 13), 13);
    });

    it("returns null for undefined", function () {
      equal(option.asNumber(), null);
    });
  });

  describe("asString", function () {
    it("resolves value from a function", function () {
      equal(
        option.asString(function () {
          return "entered";
        }, "default"),
        "entered",
      );
    });

    it("returns default value for null", function () {
      equal(option.asString(null, "default"), "default");
    });

    it("returns string for other types", function () {
      equal(option.asString(777, "default"), "777");
    });

    it("returns default for undefined", function () {
      equal(option.asString(undefined, "default"), "default");
    });

    it("returns null for undefined", function () {
      equal(option.asString(), null);
    });
  });

  describe("asSize", function () {
    it("resolves value from a function", function () {
      equal(
        option.asSize(function () {
          return "100px";
        }, "50px"),
        "100px",
      );
    });

    it("returns default value for null", function () {
      equal(option.asSize(null, "50px"), "50px");
    });

    it("returns string with px for other number", function () {
      equal(option.asSize(100, "50px"), "100px");
    });

    it("returns default for undefined", function () {
      equal(option.asSize(undefined, "50px"), "50px");
    });

    it("returns null for undefined", function () {
      equal(option.asSize(), null);
    });
  });

  describe("asElement", function () {
    before(function () {
      this.timeout(10000);
      this.jsdom_global = jsdom_global();
      this.value = document.createElement("div");
      this.defaultValue = document.createElement("div");
    });

    after(function () {
      this.jsdom_global();
    });

    it("resolves value from a function", function () {
      var me = this;
      equal(
        option.asElement(function () {
          return me.value;
        }, this.defaultValue),
        this.value,
      );
    });

    it("returns Element", function () {
      equal(option.asElement(this.value, this.defaultValue), this.value);
    });

    it("returns default value for null", function () {
      equal(option.asElement(null, this.defaultValue), this.defaultValue);
    });

    it("returns null for undefined", function () {
      equal(option.asElement(), null);
    });
  });

  describe("binarySearchValue", function () {
    it("Finds center target on odd sized array", function () {
      equal(
        binarySearchValue(
          [
            { id: "a", val: 0 },
            { id: "b", val: 1 },
            { id: "c", val: 2 },
          ],
          1,
          "val",
        ),
        1,
      );
    });

    it("Finds target on odd sized array", function () {
      equal(
        binarySearchValue(
          [
            { id: "a", val: 0 },
            { id: "b", val: 1 },
            { id: "c", val: 2 },
          ],
          2,
          "val",
        ),
        2,
      );
    });

    it("Cannot find target", function () {
      equal(
        binarySearchValue(
          [
            { id: "a", val: 0 },
            { id: "b", val: 1 },
            { id: "c", val: 2 },
          ],
          7,
          "val",
        ),
        -1,
      );
    });
  });
});
