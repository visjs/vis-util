import {
  LayeredStorageValidator,
  LayeredStorageValidatorResult,
  createValidator,
} from "./util";

/**
 * Check that given value is equal (===) to one of the values listed.
 *
 * @param validValues - Specific allowed values.
 *
 * @returns New validator validating against given values.
 */
export function oneOf(
  validValues: unknown[] | Set<unknown>
): LayeredStorageValidator {
  const valid = new Set<unknown>(validValues);

  return createValidator(
    "value has to be one of: " +
      [...validValues.values()]
        .map((validValue): string => {
          try {
            return JSON.stringify(validValue) ?? "<N/A>";
          } catch (error) {
            return `<${error.message}>`;
          }
        })
        .join(", "),
    function oneOfValidator(value: unknown): LayeredStorageValidatorResult {
      return valid.has(value);
    }
  );
}

export const fail: LayeredStorageValidator = createValidator(
  "all values will fail",
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  function fail(_value: unknown): LayeredStorageValidatorResult {
    return false;
  }
);

export const pass: LayeredStorageValidator = createValidator(
  "all values will pass",
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  function pass(_value: unknown): LayeredStorageValidatorResult {
    return true;
  }
);
