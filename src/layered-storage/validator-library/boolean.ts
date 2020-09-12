import {
  LayeredStorageValidator,
  LayeredStorageValidatorResult,
  createValidator,
} from "./util";

export const boolean: LayeredStorageValidator = createValidator(
  "value has to be a boolean",
  function boolean(value: unknown): LayeredStorageValidatorResult {
    return typeof value === "boolean";
  }
);
