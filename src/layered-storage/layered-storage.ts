import {
  KeyRange,
  KeyValueLookup,
  LayerRange,
  Segment,
  EventCallback
} from "./common";
import { LayeredStorageCore } from "./core";
import { LayeredStorageSegment } from "./segment";
import {
  LayeredStorageSegmentTransaction,
  LayeredStorageTransaction,
  Listeners,
  MonolithicTransaction,
  SegmentTransaction,
  Listener
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
 * @typeparam KeyValue - Sets the value types associeated with their keys.
 * (TS only, ignored in JS).
 * @typeparam Layer - Sets the allowed layers.
 * (TS only, ignored in JS).
 */
export class LayeredStorage<
  KeyValue extends KeyValueLookup,
  Layer extends LayerRange
> {
  private _core = new LayeredStorageCore<KeyValue, Layer>();
  private _listeners: Listeners<keyof KeyValue> = new Map();

  public get<Key extends keyof KeyValue>(
    segment: Segment,
    key: Key
  ): KeyValue[Key] | undefined;
  public get<Key extends keyof KeyValue>(key: Key): KeyValue[Key] | undefined;
  public get<Key extends keyof KeyValue>(
    ...rest: [Key] | [Segment, Key]
  ): KeyValue[Key] | undefined {
    return rest.length === 1
      ? this._core.get(this._core.monolithic, rest[0])
      : this._core.get(rest[0], rest[1]);
  }

  public has<Key extends keyof KeyValue>(segment: Segment, key: Key): boolean;
  public has<Key extends keyof KeyValue>(key: Key): boolean;
  public has(...rest: [keyof KeyValue] | [Segment, keyof KeyValue]): boolean {
    return rest.length === 1
      ? this._core.has(this._core.monolithic, rest[0])
      : this._core.has(rest[0], rest[1]);
  }

  public set<Key extends keyof KeyValue>(
    layer: Layer,
    segment: Segment,
    key: Key,
    value: KeyValue[Key]
  ): void;
  public set<Key extends keyof KeyValue>(
    layer: Layer,
    key: Key,
    value: KeyValue[Key]
  ): void;
  public set<Key extends keyof KeyValue>(
    ...rest: [Layer, Segment, Key, KeyValue[Key]] | [Layer, Key, KeyValue[Key]]
  ): void {
    this.runTransaction(
      (transaction): void =>
        void (rest.length === 3
          ? transaction.set(rest[0], rest[1], rest[2])
          : transaction.set(rest[0], rest[1], rest[2], rest[3]))
    );
  }

  public delete<Key extends keyof KeyValue>(
    layer: Layer,
    segment: Segment,
    key: Key
  ): KeyValue[Key];
  public delete<Key extends keyof KeyValue>(
    layer: Layer,
    key: Key
  ): KeyValue[Key];
  public delete<Key extends keyof KeyValue>(
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
  ): LayeredStorageSegmentTransaction<KeyValue, Layer>;
  public openTransaction(): LayeredStorageTransaction<KeyValue, Layer>;
  public openTransaction(
    segment?: Segment
  ):
    | LayeredStorageSegmentTransaction<KeyValue, Layer>
    | LayeredStorageTransaction<KeyValue, Layer> {
    return segment == null
      ? new MonolithicTransaction<KeyValue, Layer>(this._core, this._listeners)
      : new SegmentTransaction<KeyValue, Layer>(
          this._core,
          this._listeners,
          segment
        );
  }

  public runTransaction(
    segment: Segment,
    callback: (
      transaction: LayeredStorageSegmentTransaction<KeyValue, Layer>
    ) => void
  ): void;
  public runTransaction(
    callback: (transaction: LayeredStorageTransaction<KeyValue, Layer>) => void
  ): void;
  public runTransaction(
    ...rest:
      | [
          Segment,
          (
            transaction: LayeredStorageSegmentTransaction<KeyValue, Layer>
          ) => void
        ]
      | [(transaction: LayeredStorageTransaction<KeyValue, Layer>) => void]
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
   * @returns A new segmented instance premanently bound to this instance.
   */
  public openSegment(segment: Segment): LayeredStorageSegment<KeyValue, Layer> {
    return new LayeredStorageSegment(this, segment);
  }

  /**
   * Delete all data belonging to a segment.
   *
   * @param segment - The segment whose data will be deleted.
   */
  public deleteSegmentData(segment: Segment): void {
    return this._core.deleteSegmentData(segment);
  }

  public on(
    segment: Segment,
    keys: (keyof KeyValue | RegExp) | (keyof KeyValue | RegExp)[],
    callback: EventCallback<keyof KeyValue>
  ): () => void;
  public on(
    keys: (keyof KeyValue | RegExp) | (keyof KeyValue | RegExp)[],
    callback: EventCallback<keyof KeyValue>
  ): () => void;
  public on(
    ...rest:
      | [
          Segment,
          (keyof KeyValue | RegExp) | (keyof KeyValue | RegExp)[],
          EventCallback<keyof KeyValue>
        ]
      | [
          (keyof KeyValue | RegExp) | (keyof KeyValue | RegExp)[],
          EventCallback<keyof KeyValue>
        ]
  ): () => void {
    return rest.length === 2
      ? this._on(
          this._core.monolithic,
          Array.isArray(rest[0]) ? rest[0] : [rest[0]],
          rest[1]
        )
      : this._on(
          rest[0],
          Array.isArray(rest[1]) ? rest[1] : [rest[1]],
          rest[2]
        );
  }
  private _on(
    segment: Segment,
    keys: (keyof KeyValue | RegExp)[],
    callback: EventCallback<keyof KeyValue>
  ): () => void {
    const literals = keys.filter(
      (value): value is keyof KeyValue => !(value instanceof RegExp)
    );
    const functions = keys
      .filter((value): value is RegExp => value instanceof RegExp)
      .map((regexp): ((input: string) => boolean) => regexp.test.bind(regexp));

    const test = (key: KeyRange): boolean =>
      literals.includes(key) ||
      (typeof key === "string" && functions.some((func): boolean => func(key)));

    const listener: Listener<keyof KeyValue> = { test, callback };

    (
      this._listeners.get(segment) ||
      this._listeners.set(segment, []).get(segment)!
    ).push(listener);

    return this._off.bind(this, segment, listener);
  }

  private _off(segment: Segment, listener: Listener<keyof KeyValue>): void {
    const listeners = this._listeners.get(segment);
    if (listeners == null) {
      return;
    }

    listeners.splice(listeners.indexOf(listener), 1);
  }
}
