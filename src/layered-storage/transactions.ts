import { LS_DELETE, KeyValueLookup, LayerRange, Segment } from "./common";
import { LayeredStorageCore } from "./core";

/**
 * A transaction working with a single segment.
 *
 * @typeParam Layer - The allowed layers.
 * @typeParam IKV - The value types associeated with their keys on input (set).
 * @typeParam OKV - The value types associeated with their keys on output (get,
 * export).
 */
export class LayeredStorageTransaction<
  Layer extends LayerRange,
  IKV extends OKV,
  OKV extends KeyValueLookup
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
    private readonly _storageCore: LayeredStorageCore<Layer, IKV, OKV>,
    private readonly _segment: Segment
  ) {}

  /**
   * Queue a value to be set.
   *
   * @param layer - Which layer to save the value into.
   * @param key - Key that can be used to retrieve or overwrite this value later.
   * @param value - The value to be saved or the LS_DELETE constant to delete the key.
   */
  public set<Key extends keyof IKV>(
    layer: Layer,
    key: Key,
    value: typeof LS_DELETE | IKV[Key]
  ): void {
    this._actions.push(
      this._storageCore.twoPartSet(layer, this._segment, key, value)
    );
  }

  /**
   * Queue a value to be deleted.
   *
   * @param layer - Which layer to delete from.
   * @param key - The key that identifies the value to be deleted.
   */
  public delete(layer: Layer, key: keyof IKV): void {
    this._actions.push((): void => {
      this._storageCore.delete(layer, this._segment, key);
    });
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
