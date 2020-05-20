import { expect } from "chai";

import { isValidRGBA } from "../src";

describe("isValidRGBA", function (): void {
  const valid = [
    "RGBA(7, 200, 8, .7)",
    "RGBA(7, 200, 8, 0.7)",
    "RGba(255,255,255,1)",
    "Rgba(0,12,123,0.321)",
    "rGBa(44, 7, 220,0.92)",
    "rGba(210, 50,220, 0.42)",
    "rgBa(210,50, 220,0.37)",
    "rgbA( 72 , 11 , 123 , 0.21 )",
    "rgba(0,0,0,0)",
  ];
  const invalid = [
    " ",
    " RGBA(0, 12, 123, 0.3) ",
    " RGBA(210,50,220,0)",
    "#000000",
    "#abc",
    "",
    "(0,12,123)",
    "0",
    "0,12,123)",
    "5,7,9",
    "RGBA(210, 50, 220, 0.77) ",
    "false",
    "garbage",
    "hi rgb(0,12,123)",
    "orange",
    "rgb 7, 7, 7",
    "rgb(0, 12, 123)",
    "rgb(0,12,123, 0.2)",
    "rgba(0, 0, -1, 0)",
    "rgba(0, 0, 0, -1)",
    "rgba(0, 0, 0, 1.1)",
    "rgba(0, 0, 0, 2)",
    "rgba(0, 12, 123, 0.7) :-)",
    "rgba(0, 300, 0, 0)",
    "rgba(0,1 2,0,0)",
    "rgba(0,12,123,0.3",
    "rgba(256, 0, 0, 0)",
    "rgba(7, 8, 9)",
    "rgba(7,8,9)",
    "the color is #00AAAA",
    "true",
  ];

  describe("Valid", function (): void {
    valid.forEach((color): void => {
      it(color, function (): void {
        expect(isValidRGBA(color)).to.be.true;
      });
    });
  });

  describe("Invalid", function (): void {
    invalid.forEach((color): void => {
      it(color, function (): void {
        expect(isValidRGBA(color)).to.be.false;
      });
    });
  });
});
