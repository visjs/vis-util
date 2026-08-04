import { expect } from "chai";
import jsdom_global from "jsdom-global";

import {
  binarySearchValue,
  deepExtend,
  easingFunctions,
  equalArray,
  fillIfDefined,
  getScrollBarWidth,
  getType,
  isDate,
  mergeOptions,
  option,
  recursiveDOMDelete,
  selectiveDeepExtend,
  selectiveNotDeepExtend,
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

      expect(a.color).to.equal(result.color);
      expect(a.notInSource).to.equal(true);
      if (checkCopyTarget) {
        expect(a.notInTarget).to.equal(true);
      } else {
        expect(a.notInTarget).to.equal(undefined);
      }

      var sub = a.sub;
      expect(sub).to.not.equal(undefined);
      expect(sub.enabled).to.equal(result.sub.enabled);
      expect(sub.notInSource).to.equal(true);
      if (checkCopyTarget) {
        expect(sub.notInTarget).to.equal(true);
      } else {
        expect(sub.notInTarget).to.equal(undefined);
      }

      sub = a.sub.sub2;
      expect(sub).to.not.equal(undefined);
      expect(sub.font).to.equal(result.sub.sub2.font);
      expect(sub.notInSource).to.equal(true);
      expect(a.subNotInSource).to.not.equal(undefined);
      if (checkCopyTarget) {
        expect(a.subNotInTarget.enabled).to.equal(true);
        expect(sub.notInTarget).to.equal(true);
      } else {
        expect(a.subNotInTarget).to.equal(undefined);
        expect(sub.notInTarget).to.equal(undefined);
      }
    }

    /*
     * Spot check on values of a unchanged as intended
     */
    function testAUnchanged(a) {
      var sub = a.sub;
      expect(sub).to.not.equal(undefined);
      expect(sub.enabled).to.equal(true);
      expect(sub.notInSource).to.equal(true);
      expect(sub.notInTarget).to.equal(undefined);
      expect(sub.deleteThis).to.equal(true);

      sub = a.sub.sub2;
      expect(sub).to.not.equal(undefined);
      expect(sub.font).to.equal("arial");
      expect(sub.notInSource).to.equal(true);
      expect(sub.notInTarget).to.equal(undefined);

      expect(a.subNotInSource).to.not.equal(undefined);
      expect(a.subNotInTarget).to.equal(undefined);
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
      expect(a.sub.deleteThis).to.equal(null);
      expect(a.deleteThis).to.equal(null);
      expect(a.subDeleteThis).to.equal(null);
    });

    it("performs fillIfDefined() as advertized with deletion", function () {
      var a = this.a;
      var b = this.b;

      fillIfDefined(a, b, true); //  thrid param: allowDeletion
      checkExtended(a, b);

      // Following should be removed now
      expect(a.sub.deleteThis).to.equal(undefined);
      expect(a.deleteThis).to.equal(undefined);
      expect(a.subDeleteThis).to.equal(undefined);
    });

    it("performs selectiveDeepExtend() as advertized", function () {
      var a = this.a;
      var b = this.b;

      // pedantic: copy nothing
      selectiveDeepExtend([], a, b);
      expect(a.color).to.equal("red");
      expect(a.notInSource).to.equal(true);
      expect(a.notInTarget).to.equal(undefined);

      // pedantic: copy nonexistent property (nothing happens)
      expect(b.iDontExist).to.equal(undefined);
      selectiveDeepExtend(["iDontExist"], a, b, true);
      expect(a.iDontExist).to.equal(undefined);

      // At this point nothing should have changed yet.
      testAUnchanged(a);

      // Copy one property
      selectiveDeepExtend(["color"], a, b);
      expect(a.color).to.equal("green");

      // Copy property Object
      var sub = a.sub;
      expect(sub.deleteThis).to.equal(true); // pre
      selectiveDeepExtend(["sub"], a, b);
      expect(sub).to.not.equal(undefined);
      expect(sub.enabled).to.equal(false);
      expect(sub.notInSource).to.equal(true);
      expect(sub.notInTarget).to.equal(true);
      expect(sub.deleteThis).to.equal(null);

      // Copy new Objects
      expect(a.notInTarget).to.equal(undefined); // pre
      expect(a.subNotInTarget).to.equal(undefined); // pre
      selectiveDeepExtend(["notInTarget", "subNotInTarget"], a, b);
      expect(a.notInTarget).to.equal(true);
      expect(a.subNotInTarget.enabled).to.equal(true);

      // Copy null objects
      expect(a.deleteThis).to.not.equal(null); // pre
      expect(a.subDeleteThis).to.not.equal(null); // pre
      selectiveDeepExtend(["deleteThis", "subDeleteThis"], a, b);

      // NOTE: if allowDeletion === false, null values are copied over!
      //       This is due to existing logic; it might not be the intention and hence a bug
      expect(a.deleteThis).to.equal(null);
      expect(a.subDeleteThis).to.equal(null);
    });

    it("performs selectiveDeepExtend() as advertized with deletion", function () {
      var a = this.a;
      var b = this.b;

      // Only test expected differences here with test allowDeletion === false

      // Copy object property with properties to be deleted
      var sub = a.sub;
      expect(sub.deleteThis).to.equal(true); // pre
      selectiveDeepExtend(["sub"], a, b, true);
      expect(sub.deleteThis).to.equal(undefined); // should be deleted

      // Spot check on rest of properties in `a.sub` - there should have been copied
      sub = a.sub;
      expect(sub).to.not.equal(undefined);
      expect(sub.enabled).to.equal(false);
      expect(sub.notInSource).to.equal(true);
      expect(sub.notInTarget).to.equal(true);

      // Copy null objects
      expect(a.deleteThis).to.equal(true); // pre
      expect(a.subDeleteThis).to.not.equal(undefined); // pre
      expect(a.subDeleteThis.enabled).to.equal(true); // pre
      selectiveDeepExtend(["deleteThis", "subDeleteThis"], a, b, true);
      expect(a.deleteThis).to.equal(undefined); // should be deleted
      expect(a.subDeleteThis).to.equal(undefined); // should be deleted
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
      expect(a.notInTarget).to.equal(undefined); // pre
      expect(a.subNotInTarget).to.equal(undefined); // pre
      selectiveNotDeepExtend(["notInTarget", "subNotInTarget"], a, b);
      expect(a.notInTarget).to.equal(undefined); // not copied
      expect(a.subNotInTarget).to.equal(undefined); // not copied
      expect(a.sub.notInTarget).to.equal(true); // copied!
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
      expect(a.notInTarget).to.equal(undefined); // pre
      expect(a.subNotInTarget).to.equal(undefined); // pre
      expect(a.deleteThis).to.equal(true); // pre
      expect(a.subDeleteThis).to.not.equal(undefined); // pre
      expect(a.sub.deleteThis).to.equal(true); // pre
      expect(a.subDeleteThis.enabled).to.equal(true); // pre
      selectiveNotDeepExtend(["notInTarget", "subNotInTarget"], a, b, true);
      expect(a.deleteThis).to.equal(undefined); // should be deleted
      expect(a.sub.deleteThis).to.not.equal(undefined); // not deleted! Original logic, could be a bug
      expect(a.subDeleteThis).to.equal(undefined); // should be deleted
      // Spot check: following should be same as allowDeletion === false
      expect(a.notInTarget).to.equal(undefined); // not copied
      expect(a.subNotInTarget).to.equal(undefined); // not copied
      expect(a.sub.notInTarget).to.equal(true); // copied!
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
      expect(a.deleteThis).to.equal(true); // pre
      expect(a.subDeleteThis).to.not.equal(undefined); // pre
      expect(a.subDeleteThis.enabled).to.equal(true); // pre
      deepExtend(a, b, false, true);
      checkExtended(a, b, true); // Normal copy should be good
      expect(a.deleteThis).to.equal(undefined); // should be deleted
      expect(a.subDeleteThis).to.equal(undefined); // should be deleted
      expect(a.sub.deleteThis).to.not.equal(undefined); // not deleted!!! Original logic, could be a bug
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
      expect(mergeTarget.someValue).to.equal(
        undefined,
        "Non-object option should not be copied",
      );
      expect(mergeTarget.anObject).to.equal(undefined);

      mergeOptions(mergeTarget, options, "aBoolOption");
      expect(mergeTarget.aBoolOption).to.not.equal(
        undefined,
        "option aBoolOption should now be an object",
      );
      expect(mergeTarget.aBoolOption.enabled).to.equal(
        false,
        "enabled value option aBoolOption should have been copied into object",
      );

      mergeOptions(mergeTarget, options, "anObject");
      expect(mergeTarget.anObject).to.not.equal(
        undefined,
        "Option object is not copied",
      );
      expect(mergeTarget.anObject.answer).to.equal(42);
      expect(mergeTarget.anObject.enabled).to.equal(true);

      mergeOptions(mergeTarget, options, "anotherObject");
      expect(mergeTarget.anotherObject.enabled).to.equal(
        false,
        "enabled value from options must have priority",
      );

      mergeOptions(mergeTarget, options, "merge");
      expect(mergeTarget.merge).to.equal(
        undefined,
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
      expect(mergeTarget.someValue).to.equal(
        false,
        "Non-object option should not be copied",
      );
      expect(mergeTarget.anObject.answer).to.equal(
        49,
        "Sibling option should not be changed",
      );

      mergeOptions(mergeTarget, options, "aBoolOption");
      expect(mergeTarget.aBoolOption).to.not.equal(
        true,
        "option enabled should have been overwritten",
      );
      expect(mergeTarget.aBoolOption.enabled).to.equal(
        false,
        "enabled value option aBoolOption should have been copied into object",
      );

      mergeOptions(mergeTarget, options, "anObject");
      expect(mergeTarget.anObject.answer).to.equal(42);
      expect(mergeTarget.anObject.enabled).to.equal(true);

      mergeOptions(mergeTarget, options, "anotherObject");
      expect(mergeTarget.anotherObject).to.not.equal(
        undefined,
        "Option object is not copied",
      );
      expect(mergeTarget.anotherObject.enabled).to.equal(
        false,
        "enabled value from options must have priority",
      );

      mergeOptions(mergeTarget, options, "merge");
      expect(mergeTarget.merge).to.equal(
        "hello",
        "Explicit null-option should not be copied, already present in target",
      );
    });

    it("gracefully handles bad input", function () {
      var mergeTarget = {};
      var options = {
        merge: null,
      };

      var errMsg = "Non-object parameters should not be accepted";
      expect(() => mergeOptions(null, options, "anything"), errMsg).to.throw(
        Error,
      );
      expect(
        () => mergeOptions(undefined, options, "anything"),
        errMsg,
      ).to.throw(Error);
      expect(() => mergeOptions(42, options, "anything"), errMsg).to.throw(
        Error,
      );
      expect(
        () => mergeOptions(mergeTarget, null, "anything"),
        errMsg,
      ).to.throw(Error);
      expect(
        () => mergeOptions(mergeTarget, undefined, "anything"),
        errMsg,
      ).to.throw(Error);
      expect(() => mergeOptions(mergeTarget, 42, "anything"), errMsg).to.throw(
        Error,
      );
      expect(() => mergeOptions(mergeTarget, options, null), errMsg).to.throw(
        Error,
      );
      expect(
        () => mergeOptions(mergeTarget, options, undefined),
        errMsg,
      ).to.throw(Error);
      expect(
        () => mergeOptions(mergeTarget, options, "anything", null),
        errMsg,
      ).to.throw(Error);
      expect(
        () => mergeOptions(mergeTarget, options, "anything", "not an object"),
        errMsg,
      ).to.throw(Error);

      mergeOptions(mergeTarget, options, "iDontExist");
      expect(mergeTarget.iDontExist).to.equal(undefined);
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
      expect(mergeTarget.merge.enabled).to.equal(
        false,
        "null-option should create an empty target object",
      );

      mergeOptions(mergeTarget, options, "missingEnabled", globalOptions);
      expect(mergeTarget.missingEnabled.enabled).to.equal(false);

      mergeOptions(mergeTarget, options, "alsoMissingEnabled", globalOptions);
      expect(mergeTarget.alsoMissingEnabled.enabled).to.equal(true);
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
      expect(root.children.length).to.equal(0);
      expect(parent.children.length).to.equal(0);
      expect(parentSibiling.children.length).to.equal(0);
      expect(child.children.length).to.equal(0);
      expect(childSibling.children.length).to.equal(0);
    });
  });

  describe("isDate", function () {
    it("identifies a Date", function () {
      expect(isDate(new Date())).to.equal(true);
    });

    it("identifies an ASPDate as String", function () {
      expect(isDate("Date(1198908717056)")).to.equal(true);
    });

    it("identifies a date string", function () {
      expect(isDate("1995-01-01")).to.equal(true);
    });

    it("identifies a date string", function () {
      expect(isDate("")).to.equal(false);
    });

    it("identifies non-dates", function () {
      expect(isDate(null)).to.equal(false);
      expect(isDate(undefined)).to.equal(false);
      expect(isDate([1, 2, 3])).to.equal(false);
      expect(isDate({ a: 42 })).to.equal(false);
      expect(isDate(42)).to.equal(false);
      expect(isDate("meow")).to.equal(false);
    });
  });

  describe("getType", function () {
    it("of object null is null", function () {
      expect(getType(null)).to.equal("null");
    });

    it("of object Boolean is Boolean", function () {
      function Tester() {}
      Tester.prototype = Object.create(Boolean.prototype);
      expect(getType(new Tester("true"))).to.equal("Boolean");
    });

    it("of object Number is Number", function () {
      function Tester() {}
      Tester.prototype = Object.create(Number.prototype);
      expect(getType(new Tester(1))).to.equal("Number");
    });

    it("of object String is String", function () {
      function Tester() {}
      Tester.prototype = Object.create(String.prototype);
      expect(getType(new Tester("stringy!"))).to.equal("String");
    });

    it("of object Array is Array", function () {
      expect(getType([])).to.equal("Array");
    });

    it("of object Date is Date", function () {
      expect(getType(new Date())).to.equal("Date");
    });

    it("of object any other type is Object", function () {
      expect(getType({})).to.equal("Object");
    });

    it("of number is Number", function () {
      expect(getType(1)).to.equal("Number");
    });

    it("of boolean is Boolean", function () {
      expect(getType(true)).to.equal("Boolean");
    });

    it("of string is String", function () {
      expect(getType("string")).to.equal("String");
    });

    it("of undefined is undefined", function () {
      expect(getType()).to.equal("undefined");
    });
  });

  describe("easingFunctions", function () {
    it("take a number and output a number", function () {
      for (var key in easingFunctions) {
        if (Object.prototype.hasOwnProperty.call(easingFunctions, key)) {
          expect(typeof easingFunctions[key](1)).to.equal("number");
          expect(typeof easingFunctions[key](0.2)).to.equal("number");
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
      expect(getScrollBarWidth()).to.equal(0);
    });
  });

  describe("equalArray", function () {
    it("arrays of different lengths are not equal", function () {
      expect(equalArray([1, 2, 3], [1, 2])).to.equal(false);
    });

    it("arrays with different content are not equal", function () {
      expect(equalArray([1, 2, 3], [3, 2, 1])).to.equal(false);
    });

    it("same content arrays are equal", function () {
      expect(equalArray([1, 2, 3], [1, 2, 3])).to.equal(true);
    });

    it("empty arrays are equal", function () {
      expect(equalArray([], [])).to.equal(true);
    });

    it("the same array is equal", function () {
      var arr = [1, 2, 3];
      expect(equalArray(arr, arr)).to.equal(true);
    });
  });

  describe("asBoolean", function () {
    it("resolves value from a function", function () {
      expect(
        option.asBoolean(function () {
          return true;
        }, false),
      ).to.equal(true);
    });

    it("returns default value for null", function () {
      expect(option.asBoolean(null, true)).to.equal(true);
    });

    it("returns true for other types", function () {
      expect(option.asBoolean("should be true", false)).to.equal(true);
    });

    it("returns null for undefined", function () {
      expect(option.asBoolean()).to.equal(null);
    });
  });

  describe("asNumber", function () {
    it("resolves value from a function", function () {
      expect(
        option.asNumber(function () {
          return 777;
        }, 13),
      ).to.equal(777);
    });

    it("returns default value for null", function () {
      expect(option.asNumber(null, 13)).to.equal(13);
    });

    it("returns number for other types", function () {
      expect(option.asNumber("777", 13)).to.equal(777);
    });

    it("returns default for NaN", function () {
      expect(option.asNumber(NaN, 13)).to.equal(13);
    });

    it("returns null for undefined", function () {
      expect(option.asNumber()).to.equal(null);
    });
  });

  describe("asString", function () {
    it("resolves value from a function", function () {
      expect(
        option.asString(function () {
          return "entered";
        }, "default"),
      ).to.equal("entered");
    });

    it("returns default value for null", function () {
      expect(option.asString(null, "default")).to.equal("default");
    });

    it("returns string for other types", function () {
      expect(option.asString(777, "default")).to.equal("777");
    });

    it("returns default for undefined", function () {
      expect(option.asString(undefined, "default")).to.equal("default");
    });

    it("returns null for undefined", function () {
      expect(option.asString()).to.equal(null);
    });
  });

  describe("asSize", function () {
    it("resolves value from a function", function () {
      expect(
        option.asSize(function () {
          return "100px";
        }, "50px"),
      ).to.equal("100px");
    });

    it("returns default value for null", function () {
      expect(option.asSize(null, "50px")).to.equal("50px");
    });

    it("returns string with px for other number", function () {
      expect(option.asSize(100, "50px")).to.equal("100px");
    });

    it("returns default for undefined", function () {
      expect(option.asSize(undefined, "50px")).to.equal("50px");
    });

    it("returns null for undefined", function () {
      expect(option.asSize()).to.equal(null);
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
      expect(
        option.asElement(function () {
          return me.value;
        }, this.defaultValue),
      ).to.equal(this.value);
    });

    it("returns Element", function () {
      expect(option.asElement(this.value, this.defaultValue)).to.equal(
        this.value,
      );
    });

    it("returns default value for null", function () {
      expect(option.asElement(null, this.defaultValue)).to.equal(
        this.defaultValue,
      );
    });

    it("returns null for undefined", function () {
      expect(option.asElement()).to.equal(null);
    });
  });

  describe("binarySearchValue", function () {
    it("Finds center target on odd sized array", function () {
      expect(
        binarySearchValue(
          [
            { id: "a", val: 0 },
            { id: "b", val: 1 },
            { id: "c", val: 2 },
          ],
          1,
          "val",
        ),
      ).to.equal(1);
    });

    it("Finds target on odd sized array", function () {
      expect(
        binarySearchValue(
          [
            { id: "a", val: 0 },
            { id: "b", val: 1 },
            { id: "c", val: 2 },
          ],
          2,
          "val",
        ),
      ).to.equal(2);
    });

    it("Cannot find target", function () {
      expect(
        binarySearchValue(
          [
            { id: "a", val: 0 },
            { id: "b", val: 1 },
            { id: "c", val: 2 },
          ],
          7,
          "val",
        ),
      ).to.equal(-1);
    });
  });
});
