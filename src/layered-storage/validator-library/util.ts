import { LayeredStorageValidator } from "./public-util";

export * from "./public-util";

/**
 * Create human readable sublist with header from multiple validators.
 *
 * @param header - The text that will be used as header (followed by colon).
 * @param validators - The validators that will be used as bullets in the
 * sublist.
 *
 * @returns Ready to use sublist with header.
 */
export function sublistDescriptions(
  header: string,
  validators: LayeredStorageValidator[]
): string {
  return [
    `${header}:`,
    ...[...validators.values()].map(
      (validator): string => `  - ${validator.description}`
    ),
  ].join("\n");
}
