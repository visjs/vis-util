import { expect } from "chai";

import { hexToRGB, type RGB } from "../src/index.ts";

describe("hexToRGB", function (): void {
  const valid = [
    { color: "#000000", expected: { r: 0x00, g: 0x00, b: 0x00 } },
    { color: "#0acdc0", expected: { r: 0x0a, g: 0xcd, b: 0xc0 } },
    { color: "#AC00DC", expected: { r: 0xac, g: 0x00, b: 0xdc } },
    { color: "#09afAF", expected: { r: 0x09, g: 0xaf, b: 0xaf } },
    { color: "#000", expected: { r: 0x00, g: 0x00, b: 0x00 } },
    { color: "#0ac", expected: { r: 0x00, g: 0xaa, b: 0xcc } },
    { color: "#0DC", expected: { r: 0x00, g: 0xdd, b: 0xcc } },
    { color: "#09a", expected: { r: 0x00, g: 0x99, b: 0xaa } },
    { color: "#fAF", expected: { r: 0xff, g: 0xaa, b: 0xff } },
  ];
  valid.push(
    // without #
    ...valid.map(({ color, expected }): { color: string; expected: RGB } => ({
      color: color.slice(1),
      expected,
    })),
  );

  const invalid = [
    // 5 or 2 digits
    ...valid.map(({ color }): string => color.slice(0, -1)),
    // 4 or 1 digit
    ...valid.map(({ color }): string => color.slice(0, -2)),
    // 7 or 4 digits
    ...valid.map(({ color }): string => color + "0"),
    // 8 or 5 digits
    ...valid.map(({ color }): string => color + "Fa"),
    " #000000",
    " ",
    "##abc",
    "#000 ",
    "#ABC is a color",
    "#abc-ef",
    "#Ř0AABB",
    "",
    "0",
    "false",
    "garbage",
    "orange",
    "the color is #00AAAA",
    "true",
  ];

  describe("Valid", function (): void {
    valid.forEach(({ color, expected }): void => {
      it(color, function (): void {
        expect(hexToRGB(color)).to.be.deep.equal(expected);
      });
    });
  });

  describe("Invalid", function (): void {
    invalid.forEach((color): void => {
      it(color, function (): void {
        expect(hexToRGB(color)).to.be.null;
      });
    });
  });
});
