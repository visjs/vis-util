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

  /**
   * @param segment - Which segment to search through in addition to the monolithic part of the storage.
   * @param key - The key corresponding to the requested value.
   */
  public get<Key extends keyof KeyValue>(
    segment: Segment,
    key: Key
  ): KeyValue[Key] | undefined;
  /**
   * @param key - The key corresponding to the requested value.
   */
  public get<Key extends keyof KeyValue>(key: Key): KeyValue[Key] | undefined;
  /**
   * Retrieve a value.
   *
   * @returns The value or undefined if not found.
   */
  public get<Key extends keyof KeyValue>(
    ...rest: [Key] | [Segment, Key]
  ): KeyValue[Key] | undefined {
    return rest.length === 1
      ? this._core.get(this._core.monolithic, rest[0])
      : this._core.get(rest[0], rest[1]);
  }

  /**
   * @param segment - Which segment to search through in addition to the monolithic part of the storage.
   * @param key - The key corresponding to the requested value.
   */
  public has<Key extends keyof KeyValue>(segment: Segment, key: Key): boolean;
  /**
   * @param key - The key corresponding to the requested value.
   */
  public has<Key extends keyof KeyValue>(key: Key): boolean;
  /**
   * Check if a value is present.
   *
   * @returns True if found, false otherwise.
   */
  public has(...rest: [keyof KeyValue] | [Segment, keyof KeyValue]): boolean {
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
  public set<Key extends keyof KeyValue>(
    layer: Layer,
    segment: Segment,
    key: Key,
    value: KeyValue[Key]
  ): void;
  /**
   * @param layer - Which layer to save the value into.
   * @param key - Key that can be used to retrieve or overwrite this value later.
   * @param value - The value to be saved.
   */
  public set<Key extends keyof KeyValue>(
    layer: Layer,
    key: Key,
    value: KeyValue[Key]
  ): void;
  /**
   * Save a value.
   */
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

  /**
   * @param layer - Which layer to delete from.
   * @param segment - Which segment to delete from.
   * @param key - The key that identifies the value to be deleted.
   */
  public delete<Key extends keyof KeyValue>(
    layer: Layer,
    segment: Segment,
    key: Key
  ): KeyValue[Key];
  /**
   * @param layer - Which layer to delete from.
   * @param key - The key that identifies the value to be deleted.
   */
  public delete<Key extends keyof KeyValue>(
    layer: Layer,
    key: Key
  ): KeyValue[Key];
  /**
   * Delete a value from the storage.
   */
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

  /**
   * @param segment - The segment that this transaction will be limited to.
   * @param callback - This callback will be called with the transaction as
   * it's sole parameter.
   */
  public runTransaction(
    segment: Segment,
    callback: (
      transaction: LayeredStorageSegmentTransaction<KeyValue, Layer>
    ) => void
  ): void;
  /**
   * @param callback - This callback will be called with the transaction as
   * it's sole parameter.
   */
  public runTransaction(
    callback: (transaction: LayeredStorageTransaction<KeyValue, Layer>) => void
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
   * @returns A new segmented instance permanently bound to this instance.
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
    this._core.deleteSegmentData(segment);
  }

  /**
   * @param segment - Which segment does the listener observe.
   * @param keys - These determine which keys is the listener interested in.
   * @param callback - Will be called when interesting changes are detected.
   */
  public on(
    segment: Segment,
    keys: (keyof KeyValue | RegExp) | (keyof KeyValue | RegExp)[],
    callback: EventCallback<keyof KeyValue>
  ): () => void;
  /**
   * @param keys - These determine which keys is the listener interested in.
   * @param callback - Will be called when interesting changes are detected.
   */
  public on(
    keys: (keyof KeyValue | RegExp) | (keyof KeyValue | RegExp)[],
    callback: EventCallback<keyof KeyValue>
  ): () => void;
  /**
   * Bind a listener to given changes.
   *
   * @returns An off function that can be used to unbind the listener later.
   */
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

  /**
   * Bind a listener to given changes.
   *
   * @param segment - Which segment does the listener observe.
   * @param keys - These determine which keys is the listener interested in.
   * @param callback - Will be called when interesting changes are detected.
   *
   * @returns An off function that can be used to unbind the listener later.
   */
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

  /**
   * Remove given listener.
   *
   * @remarks
   * This is internal method that should be exposed only as fully bound
   * function returned from the on method.
   *
   * @param segment - Which segment does the listener observe.
   * @param listener - The listener object itself.
   */
  private _off(segment: Segment, listener: Listener<keyof KeyValue>): void {
    const listeners = this._listeners.get(segment);
    if (listeners == null) {
      return;
    }

    listeners.splice(listeners.indexOf(listener), 1);
  }

  /**
   * Log the content of the storage into the console.
   */
  public dumpContent(): void {
    this._core.dumpContent();
  }
}
