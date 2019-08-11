import { expect } from "chai";

import { isValidRGB } from "../src";

describe("isValidRGB", function(): void {
  const valid = [
    "RGB(7, 200, 8)",
    "RGb(255,255,255)",
    "Rgb(0,12,123)",
    "rGB(44, 7, 220)",
    "rGb(210, 50,220)",
    "rgB(210,50, 220)",
    "rgb( 72 , 11 , 123 )",
    "rgb(0,0,0)"
  ];
  const invalid = [
    " ",
    " Rgb(0,12,123) ",
    " rGb(210, 50,220)",
    "#000000",
    "#abc",
    "",
    "(0,12,123)",
    "0",
    "0,12,123)",
    "5,7,9",
    "RGB(-1, 0, 0)",
    "RGB(0, -1, 0)",
    "RGB(0, 0, -1)",
    "RGB(255, 255, 256)",
    "RGB(255, 256, 255)",
    "RGB(256, 255, 255)",
    "RGBA(123, 147, 95, 1)",
    "false",
    "garbage",
    "hi rgb(0,12,123)",
    "orange",
    "rGb(210, 50,220) ",
    "rgb 7, 7, 7",
    "rgb(0, 12, 123) :-)",
    "rgb(0,12,123",
    "rgb(4 4, 7, 220)",
    "rgb(44, 7, 2 2 0)",
    "rgba(7,8,9,0.3)",
    "the color is #00AAAA",
    "true"
  ];

  describe("Valid", function(): void {
    valid.forEach(
      (color): void => {
        it(color, function(): void {
          expect(isValidRGB(color)).to.be.true;
        });
      }
    );
  });

  describe("Invalid", function(): void {
    invalid.forEach(
      (color): void => {
        it(color, function(): void {
          expect(isValidRGB(color)).to.be.false;
        });
      }
    );
  });
});
