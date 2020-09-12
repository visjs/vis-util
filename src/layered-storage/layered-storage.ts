import { KeyValueEntry, KeyValueLookup, LayerRange, Segment } from "./common";
import { LayeredStorageCore, LayeredStorageInvalidValueHandler } from "./core";
import { LayeredStorageSegment } from "./segment";
import { LayeredStorageTransaction } from "./transactions";
import { LayeredStorageValidator } from "./validator-library";

export { LayeredStorageTransaction };

/**
 * Stores data in layers and optionally segments.
 *
 * @remarks
 * - Higher layers override lower layers.
 * - Each layer can be segmented using arbitrary values.
 * - Segmented value overrides global (nonsegmented) value.
 *
 * @typeParam Layer - The allowed layers.
 * @typeParam IKV - The value types associeated with their keys on input (set).
 * @typeParam OKV - The value types associeated with their keys on output (get,
 * export).
 */
export class LayeredStorage<
  Layer extends LayerRange,
  IKV extends OKV,
  OKV extends KeyValueLookup
> {
  private readonly _core = new LayeredStorageCore<Layer, IKV, OKV>();

  public readonly global = new LayeredStorageSegment<Layer, IKV, OKV>(
    this._core,
    this._core.globalSegment
  );

  /**
   * Create a new segmented instance for working with a single segment.
   *
   * @param segment - The segment that will be used by this instance.
   *
   * @returns A new segmented instance permanently bound to this instance.
   */
  public openSegment(segment: Segment): LayeredStorageSegment<Layer, IKV, OKV> {
    return new LayeredStorageSegment(this._core, segment);
  }

  /**
   * Create a new segmented instance for working with a single segment with a
   * copy of another segments data.
   *
   * @param sourceSegment - The existing segment to be cloned.
   * @param targetSegment - The target segment which should be created.
   *
   * @throws If the target segment already exists.
   *
   * @returns A new segmented instance permanently bound to this instance.
   */
  public cloneSegment(
    sourceSegment: Segment,
    targetSegment: Segment
  ): LayeredStorageSegment<Layer, IKV, OKV> {
    this._core.cloneSegmentData(sourceSegment, targetSegment);
    return new LayeredStorageSegment(this._core, targetSegment);
  }

  /**
   * Delete all data belonging to a segment.
   *
   * @param segment - The segment whose data will be deleted.
   */
  public deleteSegmentData(segment: Segment): void {
    this._core.deleteSegmentData(segment);
  }

  /**
   * Set a handler for invalid values.
   *
   * @param handler - The function that will be called with the key, invalid
   * value and a message from the failed validator.
   */
  public setInvalidHandler(
    handler: LayeredStorageInvalidValueHandler<keyof IKV>
  ): void {
    this._core.setInvalidHandler(handler);
  }

  /**
   * Set validators for given key.
   *
   * @param key - The key whose values will be validated by this validator.
   * @param validators - The functions that return true if valid or a string
   * explaining what's wrong with the value.
   * @param replace - If true existing validators will be replaced, if false an
   * error will be thrown if some validators already exist for given key.
   */
  public setValidators<Key extends keyof IKV>(
    key: Key,
    validators: LayeredStorageValidator[],
    replace = false
  ): void {
    this._core.setValidators(key, validators, replace);
  }

  /**
   * Set an expander for given key.
   *
   * @param key - The key whose values will be expanded by this expander.
   * @param affects - The expanded keys that will be returned by the
   * expaner and also deleted if this key is deleted.
   * @param expander - The functions that returns an array of expanded key
   * value pairs.
   * @param replace - If true existing expander will be relaced, if false an
   * error will be thrown if an expander already exists for given key.
   */
  public setExpander<Key extends keyof IKV>(
    key: Key,
    affects: readonly (keyof IKV)[],
    expander: (value: IKV[Key]) => readonly KeyValueEntry<IKV, keyof IKV>[],
    replace = false
  ): void {
    this._core.setExpander(key, affects, expander, replace);
  }

  /**
   * Log the content of the storage into the console.
   */
  public dumpContent(): void {
    this._core.dumpContent();
  }
}
