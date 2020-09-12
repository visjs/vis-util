import {
  LayeredStorageValidator,
  LayeredStorageValidatorResult,
  createValidator,
} from "./util";

export const number: LayeredStorageValidator = createValidator(
  "value has to be a number",
  function numberValidator(value: unknown): LayeredStorageValidatorResult {
    return typeof value === "number";
  }
);

export const numberOdd: LayeredStorageValidator = createValidator(
  "value has to be an odd number",
  function numberOddValidator(value: unknown): LayeredStorageValidatorResult {
    return typeof value === "number" && value % 2 === 1;
  }
);

export const numberEven: LayeredStorageValidator = createValidator(
  "value has to be an even number",
  function numberEvenValidator(value: unknown): LayeredStorageValidatorResult {
    return typeof value === "number" && value % 2 === 0;
  }
);

export const numberInteger: LayeredStorageValidator = createValidator(
  "value has to be an integer number",
  function numberIntegerValidator(
    value: unknown
  ): LayeredStorageValidatorResult {
    return typeof value === "number" && value % 1 === 0;
  }
);

/**
 * Check that given value is higher than given boundary (value \> min).
 *
 * @param min - The boundary that the value will be checked against.
 *
 * @returns Validator curried with given boundary.
 */
export function numberHigherThan(min: number): LayeredStorageValidator {
  return createValidator(
    `value has to a number higher than ${min}`,

    function numberHigherThanValidator(
      value: unknown
    ): LayeredStorageValidatorResult {
      return typeof value === "number" && value > min;
    }
  );
}

/**
 * Check that given value is lower than given boundary (value \< max).
 *
 * @param max - The boundary that the value will be checked against.
 *
 * @returns Validator curried with given boundary.
 */
export function numberLowerThan(max: number): LayeredStorageValidator {
  return createValidator(
    `value has to a number lower than ${max}`,

    function numberLowerThanValidator(
      value: unknown
    ): LayeredStorageValidatorResult {
      return typeof value === "number" && value < max;
    }
  );
}

/**
 * Check that given value is at least at given boundary (value \>= min).
 *
 * @param min - The boundary that the value will be checked against.
 *
 * @returns Validator curried with given boundary.
 */
export function numberAtLeast(min: number): LayeredStorageValidator {
  return createValidator(
    `value has to a number no lower than ${min}`,

    function numberAtLeastValidator(
      value: unknown
    ): LayeredStorageValidatorResult {
      return typeof value === "number" && value >= min;
    }
  );
}

/**
 * Check that given value is at most at given boundary (value \<= max).
 *
 * @param max - The boundary that the value will be checked against.
 *
 * @returns Validator curried with given boundary.
 */
export function numberAtMost(max: number): LayeredStorageValidator {
  return createValidator(
    `value has to a number no higher than ${max}`,

    function numberAtMostValidator(
      value: unknown
    ): LayeredStorageValidatorResult {
      return typeof value === "number" && value <= max;
    }
  );
}
