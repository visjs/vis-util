import { expect } from "chai";

import { RGBToHex } from "../src";

describe("RGBToHex", function (): void {
  const valid: { args: [number, number, number]; expected: string }[] = [
    { args: [0x00, 0x00, 0x00], expected: "#000000" },
    { args: [0x00, 0x99, 0xaa], expected: "#0099aa" },
    { args: [0x00, 0xaa, 0xcc], expected: "#00aacc" },
    { args: [0x00, 0xdd, 0xcc], expected: "#00ddcc" },
    { args: [0x09, 0xaf, 0xaf], expected: "#09afaf" },
    { args: [0x0a, 0xcd, 0xc0], expected: "#0acdc0" },
    { args: [0xac, 0x00, 0xdc], expected: "#ac00dc" },
    { args: [0xff, 0xaa, 0xff], expected: "#ffaaff" },
    { args: [0xff, 0xff, 0xff], expected: "#ffffff" },
  ];

  describe("Valid", function (): void {
    valid.forEach(({ args, expected }): void => {
      it(JSON.stringify(args), function (): void {
        expect(RGBToHex(...args)).to.be.deep.equal(expected);
      });
    });
  });
});
