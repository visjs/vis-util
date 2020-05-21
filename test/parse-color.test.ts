import { expect } from "chai";

import { parseColor, ColorObject, FullColorObject } from "../src";

describe("parseColor", function (): void {
  describe("strings", function (): void {
    const inputs: { color: string; expected: FullColorObject }[] = [
      {
        color: "Hi, I’m a color :-).",
        expected: {
          background: "Hi, I’m a color :-).",
          border: "Hi, I’m a color :-).",
          hover: {
            background: "Hi, I’m a color :-).",
            border: "Hi, I’m a color :-).",
          },
          highlight: {
            background: "Hi, I’m a color :-).",
            border: "Hi, I’m a color :-).",
          },
        },
      },
      {
        color: "rgb(0, 119, 238)",
        expected: {
          background: "#0077ee",
          border: "#005fbe",
          hover: {
            background: "#3091f2",
            border: "#005fbe",
          },
          highlight: {
            background: "#3091f2",
            border: "#005fbe",
          },
        },
      },
      {
        color: "#0077EE",
        expected: {
          background: "#0077EE",
          border: "#005fbe",
          hover: {
            background: "#3091f2",
            border: "#005fbe",
          },
          highlight: {
            background: "#3091f2",
            border: "#005fbe",
          },
        },
      },
    ];

    inputs.forEach(({ color, expected }): void => {
      it(color, function (): void {
        expect(parseColor(color)).to.be.deep.equal(expected);
      });
    });
  });

  describe("color objects", function (): void {
    const inputs: {
      name: string;
      color: ColorObject;
      defaultColor?: FullColorObject;
      expected: ColorObject;
    }[] = [
      {
        name: "empty object without default color",
        color: {},
        expected: {
          background: undefined,
          border: undefined,
          hover: {
            background: undefined,
            border: undefined,
          },
          highlight: {
            background: undefined,
            border: undefined,
          },
        },
      },
      {
        name: "empty object with default color",
        color: {},
        defaultColor: {
          border: "rgb(0, 1, 2)",
          background: "rgb(3, 4, 5)",
          hover: {
            border: "rgb(6, 7, 8)",
            background: "rgb(9, 10, 11)",
          },
          highlight: {
            border: "rgb(12, 13, 14)",
            background: "rgb(15, 16, 17)",
          },
        },
        expected: {
          border: "rgb(0, 1, 2)",
          background: "rgb(3, 4, 5)",
          hover: {
            border: "rgb(6, 7, 8)",
            background: "rgb(9, 10, 11)",
          },
          highlight: {
            border: "rgb(12, 13, 14)",
            background: "rgb(15, 16, 17)",
          },
        },
      },
      {
        name: "partial without default color",
        color: {
          border: "#0077EE",
          hover: {
            background: "#123456",
          },
          highlight: {
            border: "#ABCDEF",
          },
        },
        expected: {
          background: undefined,
          border: "#0077EE",
          hover: {
            background: "#123456",
            border: undefined,
          },
          highlight: {
            background: undefined,
            border: "#ABCDEF",
          },
        },
      },
      {
        name: "full without default color",
        color: {
          border: "rgb(0, 1, 2)",
          background: "rgb(3, 4, 5)",
          hover: {
            border: "rgb(6, 7, 8)",
            background: "rgb(9, 10, 11)",
          },
          highlight: {
            border: "rgb(12, 13, 14)",
            background: "rgb(15, 16, 17)",
          },
        },
        expected: {
          border: "rgb(0, 1, 2)",
          background: "rgb(3, 4, 5)",
          hover: {
            border: "rgb(6, 7, 8)",
            background: "rgb(9, 10, 11)",
          },
          highlight: {
            border: "rgb(12, 13, 14)",
            background: "rgb(15, 16, 17)",
          },
        },
      },
      {
        name: "partial with default color",
        color: {
          border: "#023456",
          hover: {
            background: "#034567",
          },
          highlight: {
            border: "#06789A",
          },
        },
        defaultColor: {
          background: "#112345",
          border: "#123456",
          hover: {
            background: "#134567",
            border: "#145678",
          },
          highlight: {
            background: "#156789",
            border: "#16789A",
          },
        },
        expected: {
          background: "#112345",
          border: "#023456",
          hover: {
            background: "#034567",
            border: "#145678",
          },
          highlight: {
            background: "#156789",
            border: "#06789A",
          },
        },
      },
      {
        name: "strings without default color",
        color: {
          background: "#012345",
          border: "#023456",
          hover: "#034567",
          highlight: "#06789A",
        },
        expected: {
          background: "#012345",
          border: "#023456",
          hover: {
            background: "#034567",
            border: "#034567",
          },
          highlight: {
            background: "#06789A",
            border: "#06789A",
          },
        },
      },
      {
        name: "strings with default color",
        color: {
          background: "#012345",
          border: "#023456",
          hover: "#034567",
          highlight: "#045678",
        },
        defaultColor: {
          background: "#112345",
          border: "#123456",
          hover: {
            background: "#134567",
            border: "#145678",
          },
          highlight: {
            background: "#156789",
            border: "#16789A",
          },
        },
        expected: {
          background: "#012345",
          border: "#023456",
          hover: {
            background: "#034567",
            border: "#034567",
          },
          highlight: {
            background: "#045678",
            border: "#045678",
          },
        },
      },
      {
        name: "default color only",
        color: {},
        defaultColor: {
          background: "#112345",
          border: "#123456",
          hover: {
            background: "#134567",
            border: "#145678",
          },
          highlight: {
            background: "#156789",
            border: "#16789A",
          },
        },
        expected: {
          background: "#112345",
          border: "#123456",
          hover: {
            background: "#134567",
            border: "#145678",
          },
          highlight: {
            background: "#156789",
            border: "#16789A",
          },
        },
      },
    ];

    inputs.forEach(({ name, color, defaultColor, expected }): void => {
      it(name, function (): void {
        expect(
          parseColor(color, defaultColor as FullColorObject)
        ).to.be.deep.equal(expected);
      });
    });
  });
});
