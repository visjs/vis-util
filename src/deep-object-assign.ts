/**
 * Use this symbol to delete properies in deepObjectAssign.
 */
export const DELETE = Symbol("DELETE");

/**
 * Turns `undefined` into `undefined | typeof DELETE` and makes everything
 * partial. Intended to be used with `deepObjectAssign`.
 */
export type Assignable<T> = T extends undefined
  ?
      | (T extends Function
          ? T
          : T extends object
          ? { [Key in keyof T]?: Assignable<T[Key]> | undefined }
          : T)
      | typeof DELETE
  : T extends Function
  ? T | undefined
  : T extends object
  ? { [Key in keyof T]?: Assignable<T[Key]> | undefined }
  : T | undefined;

/**
 * Pure version of deepObjectAssign, it doesn't modify any of it's arguments.
 *
 * @param base - The base object that fullfils the whole interface T.
 * @param updates - Updates that may change or delete props.
 *
 * @returns A brand new instance with all the supplied objects deeply merged.
 */
export function pureDeepObjectAssign<T>(
  base: T,
  ...updates: Assignable<T>[]
): T {
  return deepObjectAssign({} as any, base, ...updates);
}

/**
 * Deep version of object assign with additional deleting by the DELETE symbol.
 *
 * @param target - The object that will be augmented using the sources.
 * @param sources - Objects to be deeply merged into the target.
 *
 * @returns The target (same instance).
 */
export function deepObjectAssign<T>(target: T, ...sources: Assignable<T>[]): T;
/**
 * Deep version of object assign with additional deleting by the DELETE symbol.
 *
 * @param values - Objects to be deeply merged.
 *
 * @returns The first object from values.
 */
export function deepObjectAssign(...values: readonly any[]): any {
  const merged = deepObjectAssignNonentry(...values);
  stripDelete(merged);
  return merged;
}

/**
 * Deep version of object assign with additional deleting by the DELETE symbol.
 *
 * @remarks
 * This doesn't strip the DELETE symbols so they may end up in the final object.
 *
 * @param values - Objects to be deeply merged.
 *
 * @returns The first object from values.
 */
function deepObjectAssignNonentry(...values: readonly any[]): any {
  if (values.length < 2) {
    return values[0];
  } else if (values.length > 2) {
    return deepObjectAssignNonentry(
      deepObjectAssign(values[0], values[1]),
      ...values.slice(2)
    );
  }

  const a = values[0];
  const b = values[1];

  for (const prop of Reflect.ownKeys(b)) {
    if (!Object.prototype.propertyIsEnumerable.call(b, prop)) {
      // Ignore nonenumerable props, Object.assign() would do the same.
    } else if (b[prop] === DELETE) {
      delete a[prop];
    } else if (
      a[prop] !== null &&
      b[prop] !== null &&
      typeof a[prop] === "object" &&
      typeof b[prop] === "object" &&
      !Array.isArray(a[prop]) &&
      !Array.isArray(b[prop])
    ) {
      a[prop] = deepObjectAssignNonentry(a[prop], b[prop]);
    } else {
      a[prop] = clone(b[prop]);
    }
  }

  return a;
}

/**
 * Deep clone given object or array. In case of primitive simply return.
 *
 * @param a - Anything.
 *
 * @returns Deep cloned object/array or unchanged a.
 */
function clone(a: any): any {
  if (Array.isArray(a)) {
    return a.map((value: any): any => clone(value));
  } else if (typeof a === "object" && a !== null) {
    return deepObjectAssignNonentry({}, a);
  } else {
    return a;
  }
}

/**
 * Strip DELETE from given object.
 *
 * @param a - Object which may contain DELETE but won't after this is executed.
 */
function stripDelete(a: any): void {
  for (const prop of Object.keys(a)) {
    if (a[prop] === DELETE) {
      delete a[prop];
    } else if (typeof a[prop] === "object" && a[prop] !== null) {
      stripDelete(a[prop]);
    }
  }
}
