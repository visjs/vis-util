import { expect } from 'chai'

import { HSVToRGB, RGB } from '../src'

describe('HSVToRGB', function(): void {
  const valid: { args: [number, number, number]; expected: RGB }[] = [
    { args: [0, 0, 0], expected: { r: 0, g: 0, b: 0 } },
    { args: [0.25, 0, 0], expected: { r: 0, g: 0, b: 0 } },
    { args: [0.5, 0, 0], expected: { r: 0, g: 0, b: 0 } },
    { args: [0.75, 0, 0], expected: { r: 0, g: 0, b: 0 } },
    { args: [1, 0, 0], expected: { r: 0, g: 0, b: 0 } },

    { args: [0.2, 0.3, 1], expected: { r: 239, g: 255, b: 178 } },
    { args: [0.4, 0.3, 0.7], expected: { r: 124, g: 178, b: 146 } },
    { args: [0.6, 0.8, 0.3], expected: { r: 15, g: 39, b: 76 } },
    { args: [0.8, 1, 0.3], expected: { r: 61, g: 0, b: 76 } },
    { args: [0.95, 0.5, 0.5], expected: { r: 127, g: 63, b: 82 } },

    { args: [0, 1, 1], expected: { r: 255, g: 0, b: 0 } },
    { args: [0.25, 1, 1], expected: { r: 127, g: 255, b: 0 } },
    { args: [0.5, 1, 1], expected: { r: 0, g: 255, b: 255 } },
    { args: [0.75, 1, 1], expected: { r: 127, g: 0, b: 255 } },
    { args: [1, 1, 1], expected: { r: 255, g: 0, b: 0 } },
  ]

  describe('Valid', function(): void {
    valid.forEach(({ args, expected }): void => {
      it(JSON.stringify(args), function(): void {
        expect(HSVToRGB(...args)).to.be.deep.equal(expected)
      })
    })
  })
})
