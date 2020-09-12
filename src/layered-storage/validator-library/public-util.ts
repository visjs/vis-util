export type LayeredStorageValidatorResult = boolean | string;
export interface LayeredStorageValidator {
  (value: unknown): LayeredStorageValidatorResult;
  description: string;
}

/**
 * Helper function for validator creation.
 *
 * @remarks
 * It's use is optional. It's basically a wrapper around Object.assign() with a
 * few checks thrown in.
 *
 * @param description - The description of the validator (should be in the
 * format “value has to be a string”, that is starting with lowercase letter and
 * ending without a period).
 * @param func - The function that will do the validation itself (preferably
 * should return boolean, can return string with addition info if necessary).
 *
 * @returns Given function enriched by description property (aka validator).
 */
export function createValidator(
  description: string,
  func: (value: unknown) => LayeredStorageValidatorResult
): LayeredStorageValidator {
  if (typeof description !== "string" || description.length === 0) {
    throw new TypeError("A description has to be provided for a validator.");
  }

  if (typeof func !== "function") {
    throw new TypeError("Validator function has to be a function.");
  }

  if (func.length !== 1) {
    throw new TypeError("Validator function has take exactly one argument.");
  }

  return Object.assign(func, { description });
}
