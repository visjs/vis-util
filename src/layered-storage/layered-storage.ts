import {
  KeyValueLookup,
  LayerRange,
  Segment,
  FilteredKeyValueEntry
} from "./common";
import { LayeredStorageCore } from "./core";
import { LayeredStorageSegment } from "./segment";
import {
  LayeredStorageSegmentTransaction,
  LayeredStorageTransaction,
  MonolithicTransaction,
  SegmentTransaction
} from "./transactions";

export {
  LayeredStorageSegmentTransaction,
  LayeredStorageTransaction,
  MonolithicTransaction,
  SegmentTransaction
};

/**
 * Stores data in layers and optionally segments.
 *
 * @remarks
 * - Higher layers override lowerlayers.
 * - Each layer can be segmented using arbitrary values.
 * - Segmented value overrides monolithic (nonsegmented) value.
 *
 * @typeparam KV - Sets the value types associeated with their keys.
 * (TS only, ignored in JS).
 * @typeparam Layer - Sets the allowed layers.
 * (TS only, ignored in JS).
 */
export class LayeredStorage<
  KV extends KeyValueLookup,
  Layer extends LayerRange
> {
  private _core = new LayeredStorageCore<KV, Layer>();

  /**
   * @param segment - Which segment to search through in addition to the monolithic part of the storage.
   * @param key - The key corresponding to the requested value.
   */
  public get<Key extends keyof KV>(
    segment: Segment,
    key: Key
  ): KV[Key] | undefined;
  /**
   * @param key - The key corresponding to the requested value.
   */
  public get<Key extends keyof KV>(key: Key): KV[Key] | undefined;
  /**
   * Retrieve a value.
   *
   * @returns The value or undefined if not found.
   */
  public get<Key extends keyof KV>(
    ...rest: [Key] | [Segment, Key]
  ): KV[Key] | undefined {
    return rest.length === 1
      ? this._core.get(this._core.monolithic, rest[0])
      : this._core.get(rest[0], rest[1]);
  }

  /**
   * @param segment - Which segment to search through in addition to the monolithic part of the storage.
   * @param key - The key corresponding to the requested value.
   */
  public has<Key extends keyof KV>(segment: Segment, key: Key): boolean;
  /**
   * @param key - The key corresponding to the requested value.
   */
  public has<Key extends keyof KV>(key: Key): boolean;
  /**
   * Check if a value is present.
   *
   * @returns True if found, false otherwise.
   */
  public has(...rest: [keyof KV] | [Segment, keyof KV]): boolean {
    return rest.length === 1
      ? this._core.has(this._core.monolithic, rest[0])
      : this._core.has(rest[0], rest[1]);
  }

  /**
   * @param layer - Which layer to save the value into.
   * @param segment - Which segment to save the value into.
   * @param key - Key that can be used to retrieve or overwrite this value later.
   * @param value - The value to be saved.
   */
  public set<Key extends keyof KV>(
    layer: Layer,
    segment: Segment,
    key: Key,
    value: KV[Key]
  ): void;
  /**
   * @param layer - Which layer to save the value into.
   * @param key - Key that can be used to retrieve or overwrite this value later.
   * @param value - The value to be saved.
   */
  public set<Key extends keyof KV>(
    layer: Layer,
    key: Key,
    value: KV[Key]
  ): void;
  /**
   * Save a value.
   */
  public set<Key extends keyof KV>(
    ...rest: [Layer, Segment, Key, KV[Key]] | [Layer, Key, KV[Key]]
  ): void {
    this.runTransaction(
      (transaction): void =>
        void (rest.length === 3
          ? transaction.set(rest[0], rest[1], rest[2])
          : transaction.set(rest[0], rest[1], rest[2], rest[3]))
    );
  }

  /**
   * @param layer - Which layer to delete from.
   * @param segment - Which segment to delete from.
   * @param key - The key that identifies the value to be deleted.
   */
  public delete<Key extends keyof KV>(
    layer: Layer,
    segment: Segment,
    key: Key
  ): KV[Key];
  /**
   * @param layer - Which layer to delete from.
   * @param key - The key that identifies the value to be deleted.
   */
  public delete<Key extends keyof KV>(layer: Layer, key: Key): KV[Key];
  /**
   * Delete a value from the storage.
   */
  public delete<Key extends keyof KV>(
    ...rest: [Layer, Segment, Key] | [Layer, Key]
  ): void {
    this.runTransaction(
      (transaction): void =>
        void (rest.length === 2
          ? transaction.delete(rest[0], rest[1])
          : transaction.delete(rest[0], rest[1], rest[2]))
    );
  }

  public openTransaction(
    segment: Segment
  ): LayeredStorageSegmentTransaction<KV, Layer>;
  public openTransaction(): LayeredStorageTransaction<KV, Layer>;
  /**
   * Open a new transaction.
   *
   * @remarks
   * The transaction accumulates changes but doesn't change the content of the
   * storage until commit is called.
   *
   * @param segment - If segment is passed the transaction will be locked to
   * given segment. Otherwise the monolithic portion and all the segments will
   * be accessible.
   *
   * @returns The new transaction that can be used to set or delete values.
   */
  public openTransaction(
    segment?: Segment
  ):
    | LayeredStorageSegmentTransaction<KV, Layer>
    | LayeredStorageTransaction<KV, Layer> {
    return segment == null
      ? new MonolithicTransaction<KV, Layer>(this._core)
      : new SegmentTransaction<KV, Layer>(this._core, segment);
  }

  /**
   * @param segment - The segment that this transaction will be limited to.
   * @param callback - This callback will be called with the transaction as
   * it's sole parameter.
   */
  public runTransaction(
    segment: Segment,
    callback: (transaction: LayeredStorageSegmentTransaction<KV, Layer>) => void
  ): void;
  /**
   * @param callback - This callback will be called with the transaction as
   * it's sole parameter.
   */
  public runTransaction(
    callback: (transaction: LayeredStorageTransaction<KV, Layer>) => void
  ): void;
  /**
   * Run a new transaction.
   *
   * @remarks
   * This is the same as `openTransaction` except that it automatically commits
   * when the callback finishes execution. It is still possible to commit
   * within the body of the callback though.
   */
  public runTransaction(
    ...rest:
      | [
          Segment,
          (transaction: LayeredStorageSegmentTransaction<KV, Layer>) => void
        ]
      | [(transaction: LayeredStorageTransaction<KV, Layer>) => void]
  ): void {
    if (rest.length === 1) {
      const callback = rest[0];

      const transaction = this.openTransaction();

      // If the following throws uncommited changes will be discarded.
      callback(transaction);

      transaction.commit();
    } else {
      const [segment, callback] = rest;

      const transaction = this.openTransaction(segment);

      // If the following throws uncommited changes will be discarded.
      callback(transaction);

      transaction.commit();
    }
  }

  /**
   * Create a new segmented instance for working with a single segment.
   *
   * @param segment - The segment that will be used by this instance.
   *
   * @returns A new segmented instance permanently bound to this instance.
   */
  public openSegment(segment: Segment): LayeredStorageSegment<KV, Layer> {
    return new LayeredStorageSegment(this, segment);
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
  ): LayeredStorageSegment<KV, Layer> {
    this._core.cloneSegmentData(sourceSegment, targetSegment);
    return new LayeredStorageSegment(this, targetSegment);
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
    handler: <Key extends keyof KV>(
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
  public setValidators<Key extends keyof KV>(
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
  public setExpander<Key extends keyof KV, Affects extends keyof KV>(
    key: Key,
    affects: readonly Affects[],
    expander: (value: KV[Key]) => readonly FilteredKeyValueEntry<KV, Affects>[],
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
