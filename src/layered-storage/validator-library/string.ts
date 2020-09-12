import {
  LayeredStorageValidator,
  LayeredStorageValidatorResult,
  createValidator,
} from "./util";

export const string: LayeredStorageValidator = createValidator(
  "value has to be a string",
  function string(value: unknown): LayeredStorageValidatorResult {
    return typeof value === "string";
  }
);

/**
 * Check that given value is a string that is longer than given amount of
 * characters.
 *
 * @param minLength - The boundary that the value will be checked against.
 *
 * @returns Validator curried with given boundary.
 */
export function stringLongerThan(minLength: number): LayeredStorageValidator {
  return createValidator(
    `value has to a string longer than ${minLength} characters`,
    function stringLongerThanValidator(
      value: unknown
    ): LayeredStorageValidatorResult {
      return typeof value === "string" && value.length > minLength;
    }
  );
}

/**
 * Check that given value is a string that is shorter than given amount of
 * characters.
 *
 * @param maxLength - The boundary that the value will be checked against.
 *
 * @returns Validator curried with given boundary.
 */
export function stringShorterThan(maxLength: number): LayeredStorageValidator {
  return createValidator(
    `value has to a string shorter than ${maxLength} characters`,
    function stringShorterThanValidator(
      value: unknown
    ): LayeredStorageValidatorResult {
      return typeof value === "string" && value.length < maxLength;
    }
  );
}

/**
 * Check that given value is a string that is at least given amount of
 * characters long.
 *
 * @param minLength - The boundary that the value will be checked against.
 *
 * @returns Validator curried with given boundary.
 */
export function stringAtLeast(minLength: number): LayeredStorageValidator {
  return createValidator(
    `value has to a string no shorter than ${minLength} characters`,
    function stringAtLeastValidator(
      value: unknown
    ): LayeredStorageValidatorResult {
      return typeof value === "string" && value.length >= minLength;
    }
  );
}

/**
 * Check that given value is a string that is at most given amount of
 * characters long.
 *
 * @param maxLength - The boundary that the value will be checked against.
 *
 * @returns Validator curried with given boundary.
 */
export function stringAtMost(maxLength: number): LayeredStorageValidator {
  return createValidator(
    `value has to a string no longer than ${maxLength} characters`,
    function stringAtMostValidator(
      value: unknown
    ): LayeredStorageValidatorResult {
      return typeof value === "string" && value.length <= maxLength;
    }
  );
}

/**
 * Check that given values is a string that matches given RE.
 *
 * @param re - The regular expression that will be used for testing.
 *
 * @returns Validator validating against given RE.
 */
export function match(re: RegExp): LayeredStorageValidator {
  return createValidator(
    "value has to be a string and match: " + re.source,
    function stringMatchValidator(
      value: unknown
    ): LayeredStorageValidatorResult {
      return typeof value === "string" && re.test(value);
    }
  );
}
