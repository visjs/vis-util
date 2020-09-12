import {
  LayeredStorageValidator,
  LayeredStorageValidatorResult,
  createValidator,
  sublistDescriptions,
} from "./util";

/**
 * Combine multiple validators using and operator.
 *
 * @param validators - Validators to be combined.
 *
 * @returns New validator that combines all of them.
 */
export function and(
  ...validators: LayeredStorageValidator[]
): LayeredStorageValidator {
  return createValidator(
    sublistDescriptions("value has satisfy all of", validators),
    function andValidator(value: unknown): LayeredStorageValidatorResult {
      return validators.every(
        (validator): boolean => validator(value) === true
      );
    }
  );
}

/**
 * Combine multiple validators using or operator.
 *
 * @param validators - Validators to be combined.
 *
 * @returns New validator that combines all of them.
 */
export function or(
  ...validators: LayeredStorageValidator[]
): LayeredStorageValidator {
  return createValidator(
    sublistDescriptions("value has satisfy at least one of", validators),
    function orValidator(value: unknown): LayeredStorageValidatorResult {
      return validators.some((validator): boolean => validator(value) === true);
    }
  );
}

/**
 * Combine multiple validators using xor operator.
 *
 * @param validators - Validators to be combined.
 *
 * @returns New validator that combines all of them.
 */
export function xor(
  ...validators: LayeredStorageValidator[]
): LayeredStorageValidator {
  return createValidator(
    sublistDescriptions("value has satisfy exactly one of", validators),
    function xorValidator(value: unknown): LayeredStorageValidatorResult {
      return (
        validators.filter((validator): boolean => validator(value) === true)
          .length === 1
      );
    }
  );
}
