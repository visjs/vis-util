import {
  KeyRange,
  KeyValueLookup,
  LayerRange,
  Segment,
  KeyValueEntry
} from "./common";
import { LayeredStorageCore } from "./core";
import { LayeredStorageSegment } from "./segment";
import { LayeredStorageTransaction } from "./transactions";

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
 * (TS only, ignored in JS).
 * @typeParam KV - The value types associeated with their keys.
 * (TS only, ignored in JS).
 * @typeParam Keys - The allowed keys.
 * (TS only, ignored in JS).
 */
export class LayeredStorage<
  Layer extends LayerRange,
  KV extends KeyValueLookup<Keys>,
  Keys extends KeyRange = keyof KV
> {
  private readonly _core = new LayeredStorageCore<Layer, KV, Keys>();

  public readonly global = new LayeredStorageSegment<Layer, KV, Keys>(
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
  public openSegment(segment: Segment): LayeredStorageSegment<Layer, KV, Keys> {
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
  ): LayeredStorageSegment<Layer, KV, Keys> {
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
    handler: <Key extends Keys>(
      key: Key,
      value: KV[Key],
      message: string
    ) => void
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
  public setValidators<Key extends Keys>(
    key: Key,
    validators: ((value: KV[Key]) => true | string)[],
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
  public setExpander<Key extends Keys, Affects extends Keys>(
    key: Key,
    affects: readonly Affects[],
    expander: (value: KV[Key]) => readonly KeyValueEntry<KV, Affects>[],
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
