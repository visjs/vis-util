import { KeyValueLookup, LayerRange, Segment, KeyRange } from "./common";
import { LayeredStorageCore } from "./core";

/**
 * A transaction working with a single segment.
 *
 * @typeParam Layer - The allowed layers.
 * (TS only, ignored in JS).
 * @typeParam KV - The value types associeated with their keys.
 * (TS only, ignored in JS).
 * @typeParam Keys - The allowed keys.
 * (TS only, ignored in JS).
 */
export class LayeredStorageTransaction<
  Layer extends LayerRange,
  KV extends KeyValueLookup<Keys>,
  Keys extends KeyRange = keyof KV
> {
  /**
   * Functions that perform requested mutations when executed without any
   * arguments or this. Intended to be filled bound set and delete methods from
   * `LayeredStorageCore`.
   */
  private _actions: (() => void)[] = [];

  /**
   * Create a new transaction for a segment of given storage.
   *
   * @param _storageCore - The core that this instance will save mutations to.
   * @param _segment - The segment this instance will manage.
   */
  public constructor(
    private readonly _storageCore: LayeredStorageCore<Layer, KV, Keys>,
    private readonly _segment: Segment
  ) {}

  /**
   * Queue a value to be set.
   *
   * @param layer - Which layer to save the value into.
   * @param key - Key that can be used to retrieve or overwrite this value later.
   * @param value - The value to be saved.
   */
  public set<Key extends Keys>(layer: Layer, key: Key, value: KV[Key]): void {
    const expandedPairs = this._storageCore.expandValue(key, value);
    for (const expanded of expandedPairs) {
      this._actions.push(
        this._storageCore.twoPartSet(
          layer,
          this._segment,
          expanded[0],
          expanded[1]
        )
      );
    }
  }

  /**
   * Queue a value to be deleted.
   *
   * @param layer - Which layer to delete from.
   * @param key - The key that identifies the value to be deleted.
   */
  public delete<Key extends Keys>(layer: Layer, key: Key): void {
    for (const expandedKey of this._storageCore.expandDelete(key)) {
      this._actions.push(
        this._storageCore.delete.bind(
          this._storageCore,
          layer,
          this._segment,
          expandedKey
        )
      );
    }
  }

  /**
   * Commit all queued operations.
   */
  public commit(): void {
    // Run the mutations and clean the array for next use.
    this._actions.splice(0).forEach((action): void => {
      action();
    });
  }

  /**
   * Discard all queued operations.
   */
  public abort(): void {
    this._actions = [];
  }
}
