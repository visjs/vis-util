import { expect } from 'chai'

import { removeClassName } from '../src'

describe('removeClassName', function(): void {
  const inputs: { input: string; classes: string; expected: string }[] = [
    { input: 'a b c', classes: 'a c', expected: 'b' },
    { input: 'a b c', classes: 'b', expected: 'a c' },
    { input: 'a b c', classes: 'd', expected: 'a b c' },
    { input: 'class-1 class-2', classes: 'class-2', expected: 'class-1' },
  ]

  inputs.forEach(({ input, classes, expected }): void => {
    it(`${input} - ${classes} = ${expected}`, function(): void {
      const elem = { className: input }

      removeClassName(elem as any, classes)

      expect(elem.className).to.equal(expected)
    })
  })
})
