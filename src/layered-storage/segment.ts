import { KeyValueLookup, LayerRange, Segment } from "./common";
import {
  LayeredStorage,
  LayeredStorageSegmentTransaction
} from "./layered-storage";

/**
 * This is similar as `LayeredStorage` except that it is permanently bound to
 * given `LayeredStorage` and can only access a single `Segment`.
 *
 * @typeparam KV - Sets the value types associeated with their keys.
 * (TS only, ignored in JS).
 * @typeparam Layer - Sets the allowed layers.
 * (TS only, ignored in JS).
 */
export class LayeredStorageSegment<
  KV extends KeyValueLookup,
  Layer extends LayerRange
> {
  /**
   * Create a new storage instance for given segment.
   *
   * @param _layeredStorage - The storage that this instance will be bound to.
   * @param _segment - The segment this instance will manage.
   */
  public constructor(
    private _layeredStorage: LayeredStorage<KV, Layer>,
    private _segment: Segment
  ) {}

  /**
   * Retrieve a value.
   *
   * @param key - The key corresponding to the requested value.
   *
   * @returns The value or undefined if not found.
   */
  public get<Key extends keyof KV>(key: Key): KV[Key] | undefined {
    return this._layeredStorage.get(this._segment, key);
  }

  /**
   * Check if a value is present.
   *
   * @param key - The key corresponding to the requested value.
   *
   * @returns True if found, false otherwise.
   */
  public has<Key extends keyof KV>(key: Key): boolean {
    return this._layeredStorage.has(this._segment, key);
  }

  /**
   * Save a value.
   *
   * @param layer - Which layer to save the value into.
   * @param key - Key that can be used to retrieve or overwrite this value later.
   * @param value - The value to be saved.
   */
  public set<Key extends keyof KV>(
    layer: Layer,
    key: Key,
    value: KV[Key]
  ): void {
    this._layeredStorage.set(layer, this._segment, key, value);
  }

  /**
   * Delete a value from the storage.
   *
   * @param layer - Which layer to delete from.
   * @param key - The key that identifies the value to be deleted.
   */
  public delete<Key extends keyof KV>(layer: Layer, key: Key): void {
    this._layeredStorage.delete(layer, this._segment, key);
  }

  /**
   * Open a new transaction.
   *
   * @remarks
   * The transaction accumulates changes but doesn't change the content of the
   * storage until commit is called.
   *
   * @returns The new transaction that can be used to set or delete values.
   */
  public openTransaction(): LayeredStorageSegmentTransaction<KV, Layer> {
    return this._layeredStorage.openTransaction(this._segment);
  }

  /**
   * Run a new transaction.
   *
   * @remarks
   * This is the same as `openTransaction` except that it automatically commits
   * when the callback finishes execution. It is still possible to commit
   * within the body of the callback though.
   *
   * @param callback - This callback will be called with the transaction as
   */
  public runTransaction(
    callback: (transaction: LayeredStorageSegmentTransaction<KV, Layer>) => void
  ): void {
    this._layeredStorage.runTransaction(this._segment, callback);
  }

  /**
   * Delete all data belonging to this segment.
   */
  public close(): void {
    this._layeredStorage.deleteSegmentData(this._segment);
  }
}
