import { KeyValueLookup, LayerRange, Segment, EventCallback } from "./common";
import {
  LayeredStorage,
  LayeredStorageSegmentTransaction
} from "./layered-storage";

/**
 * This is similar as `LayeredStorage` except that it is permanently bound to
 * given `LayeredStorage` and can only access a single `Segment`.
 *
 * @typeparam KeyValue - Sets the value types associeated with their keys.
 * (TS only, ignored in JS).
 * @typeparam Layer - Sets the allowed layers.
 * (TS only, ignored in JS).
 */
export class LayeredStorageSegment<
  KeyValue extends KeyValueLookup,
  Layer extends LayerRange
> {
  public constructor(
    private _layeredStorage: LayeredStorage<KeyValue, Layer>,
    private _segment: Segment
  ) {}

  public get<Key extends keyof KeyValue>(key: Key): KeyValue[Key] | undefined {
    return this._layeredStorage.get(this._segment, key);
  }

  public has<Key extends keyof KeyValue>(key: Key): boolean {
    return this._layeredStorage.has(this._segment, key);
  }

  public set<Key extends keyof KeyValue>(
    layer: Layer,
    key: Key,
    value: KeyValue[Key]
  ): void {
    return this._layeredStorage.set(layer, this._segment, key, value);
  }

  public delete<Key extends keyof KeyValue>(layer: Layer, key: Key): void {
    return this._layeredStorage.delete(layer, this._segment, key);
  }

  public openTransaction(): LayeredStorageSegmentTransaction<KeyValue, Layer> {
    return this._layeredStorage.openTransaction(this._segment);
  }

  public runTransaction(
    callback: (
      transaction: LayeredStorageSegmentTransaction<KeyValue, Layer>
    ) => void
  ): void {
    return this._layeredStorage.runTransaction(this._segment, callback);
  }

  public close(): void {
    return this._layeredStorage.deleteSegmentData(this._segment);
  }

  public on(
    keys: (keyof KeyValue | RegExp) | (keyof KeyValue | RegExp)[],
    callback: EventCallback<keyof KeyValue>
  ): () => void {
    return this._layeredStorage.on(this._segment, keys, callback);
  }
}
