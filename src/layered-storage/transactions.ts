import {
  KeyRange,
  KeyValueLookup,
  LayerRange,
  Segment,
  EventCallback
} from "./common";
import { LayeredStorageCore } from "./core";

/**
 * Internal data structure for holding listener related data.
 */
export type Listener<Key> = {
  test: (key: KeyRange) => boolean;
  callback: EventCallback<Key>;
};

/**
 * Internal data structure for holding listeners observing each segment.
 */
export type Listeners<Key> = Map<Segment, Listener<Key>[]>;

/**
 * This is used through composition to create monolithic and segmented
 * transactions without massive code duplicities.
 *
 * @typeparam KeyValue - Sets the value types associeated with their keys.
 * (TS only, ignored in JS).
 * @typeparam Layer - Sets the allowed layers.
 * (TS only, ignored in JS).
 */
class TransactionCore<
  KeyValue extends KeyValueLookup,
  Layer extends LayerRange
> {
  /**
   * Functions that perform requested mutations when executed without any
   * arguments or this. Intended to be filled bound set and delete methods from
   * `LayeredStorageCore`.
   */
  private _actions: (() => void)[] = [];
  /**
   * Lists the changes from `_actions` in a way for easy event dispatching.
   */
  private _events = new Map<Segment, Set<keyof KeyValue>>();

  /**
   * Create a new instance of transaction core.
   *
   * @param _storageCore - The core that this instance will save mutations to.
   * @param _listeners - Listeners that should be notified after a transaction
   * was commited.
   */
  public constructor(
    private _storageCore: LayeredStorageCore<KeyValue, Layer>,
    private _listeners: Listeners<keyof KeyValue>
  ) {}

  /**
   * Queue set mutation.
   *
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
  ): void {
    this._actions.push(
      this._storageCore.set.bind(this._storageCore, layer, segment, key, value)
    );

    this._addEvent(segment, key);
  }

  /**
   * Queue delete mutation.
   *
   * @param layer - Which layer to delete from.
   * @param segment - Which segment to delete from.
   * @param key - The key that identifies the value to be deleted.
   */
  public delete<Key extends keyof KeyValue>(
    layer: Layer,
    segment: Segment,
    key: Key
  ): void {
    this._actions.push(
      this._storageCore.delete.bind(this._storageCore, layer, segment, key)
    );

    this._addEvent(segment, key);
  }

  /**
   * Commit all queued operations.
   */
  public commit(): void {
    // Reset the structures for next transaction.
    const actions = this._actions;
    this._actions = [];
    const events = this._events;
    this._events = new Map();

    // Run the mutations.
    actions.forEach((action): void => {
      action();
    });

    // Inform monolithic listeners about the mutations.
    const monolithicKeySet = events.get(this._storageCore.monolithic);
    if (monolithicKeySet) {
      const allKeys = [...monolithicKeySet];

      [...this._listeners.values()]
        .flat()
        .forEach(({ test, callback }): void => {
          const keys = allKeys.filter((key): boolean => test(key));
          if (keys.length === 0) {
            return;
          }

          callback(keys);
        });

      events.delete(this._storageCore.monolithic);
    }

    // Inform listeners on segments about the changes.
    events.forEach((keySet, segment): void => {
      const allKeys = [...keySet];

      const segmentListeners = this._listeners.get(segment);
      if (segmentListeners == null) {
        return;
      }

      segmentListeners.forEach(({ test, callback }): void => {
        const keys = allKeys.filter((key): boolean => test(key));
        if (keys.length === 0) {
          return;
        }

        callback(keys);
      });
    });
  }

  /**
   * Discard all queued operations.
   */
  public revert(): void {
    this._actions = [];
    this._events = new Map();
  }

  /**
   * Record which segments and keys were affected by the queued mutations.
   *
   * @param segment - Which segment does this mutation belong to.
   * @param key - Which key's value does this mutation affect.
   */
  private _addEvent(segment: Segment, key: keyof KeyValue): void {
    (
      this._events.get(segment) ||
      this._events.set(segment, new Set()).get(segment)!
    ).add(key);
  }
}

/**
 * A transaction working with the whole storage.
 *
 * @typeparam KeyValue - Sets the value types associeated with their keys.
 * (TS only, ignored in JS).
 * @typeparam Layer - Sets the allowed layers.
 * (TS only, ignored in JS).
 */
export interface LayeredStorageTransaction<
  KeyValue extends KeyValueLookup,
  Layer extends LayerRange
> {
  /**
   * Queue a value to be set.
   *
   * @param layer - Which layer to save the value into.
   * @param segment - Which segment to save the value into.
   * @param key - Key that can be used to retrieve or overwrite this value later.
   * @param value - The value to be saved.
   */
  set<Key extends keyof KeyValue>(
    layer: Layer,
    segment: Segment,
    key: Key,
    value: KeyValue[Key]
  ): void;
  /**
   * Queue a value to be set.
   *
   * @param layer - Which layer to save the value into.
   * @param key - Key that can be used to retrieve or overwrite this value later.
   * @param value - The value to be saved.
   */
  set<Key extends keyof KeyValue>(
    layer: Layer,
    key: Key,
    value: KeyValue[Key]
  ): void;

  /**
   * Queue a value to be deleted.
   *
   * @param layer - Which layer to delete from.
   * @param segment - Which segment to delete from.
   * @param key - The key that identifies the value to be deleted.
   */
  delete<Key extends keyof KeyValue>(
    layer: Layer,
    segment: Segment,
    key: Key
  ): void;
  /**
   * Queue a value to be deleted.
   *
   * @param layer - Which layer to delete from.
   * @param key - The key that identifies the value to be deleted.
   */
  delete<Key extends keyof KeyValue>(layer: Layer, key: Key): void;

  /**
   * Commit all queued operations.
   */
  commit(): void;

  /**
   * Discard all queued operations.
   */
  abort(): void;
}

/** @inheritdoc */
export class MonolithicTransaction<
  KeyValue extends KeyValueLookup,
  Layer extends LayerRange
> implements LayeredStorageTransaction<KeyValue, Layer> {
  private readonly _transactionCore: TransactionCore<KeyValue, Layer>;
  private readonly _monolithic: symbol;

  /**
   * Create a new transaction for given storage.
   *
   * @param storageCore - The core that this instance will save mutations to.
   * @param listeners - Listeners that should be notified after a transaction
   * was commited.
   */
  public constructor(
    storageCore: LayeredStorageCore<KeyValue, Layer>,
    listeners: Listeners<keyof KeyValue>
  ) {
    this._monolithic = storageCore.monolithic;
    this._transactionCore = new TransactionCore(storageCore, listeners);
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
  /** @inheritdoc */
  public set<Key extends keyof KeyValue>(
    ...rest: [Layer, Segment, Key, KeyValue[Key]] | [Layer, Key, KeyValue[Key]]
  ): void {
    return rest.length === 3
      ? this._transactionCore.set(rest[0], this._monolithic, rest[1], rest[2])
      : this._transactionCore.set(rest[0], rest[1], rest[2], rest[3]);
  }

  public delete<Key extends keyof KeyValue>(
    layer: Layer,
    segment: Segment,
    key: Key
  ): void;
  public delete<Key extends keyof KeyValue>(layer: Layer, key: Key): void;
  /** @inheritdoc */
  public delete<Key extends keyof KeyValue>(
    ...rest: [Layer, Segment, Key] | [Layer, Key]
  ): void {
    return rest.length === 2
      ? this._transactionCore.delete(rest[0], this._monolithic, rest[1])
      : this._transactionCore.delete(rest[0], rest[1], rest[2]);
  }

  /** @inheritdoc */
  public commit(): void {
    return this._transactionCore.commit();
  }

  /** @inheritdoc */
  public abort(): void {
    return this._transactionCore.revert();
  }
}

/** @inheritdoc */
export interface LayeredStorageSegmentTransaction<
  KeyValue extends KeyValueLookup,
  Layer extends LayerRange
> {
  /**
   * Queue a value to be set.
   *
   * @param layer - Which layer to save the value into.
   * @param key - Key that can be used to retrieve or overwrite this value later.
   * @param value - The value to be saved.
   */
  set<Key extends keyof KeyValue>(
    layer: Layer,
    key: Key,
    value: KeyValue[Key]
  ): void;

  /**
   * Queue a value to be deleted.
   *
   * @param layer - Which layer to delete from.
   * @param key - The key that identifies the value to be deleted.
   */
  delete<Key extends keyof KeyValue>(layer: Layer, key: Key): void;

  /**
   * Commit all queued operations.
   */
  commit(): void;

  /**
   * Discard all queued operations.
   */
  abort(): void;
}

/**
 * A transaction working with a single segment.
 *
 * @typeparam KeyValue - Sets the value types associeated with their keys.
 * (TS only, ignored in JS).
 * @typeparam Layer - Sets the allowed layers.
 * (TS only, ignored in JS).
 */
export class SegmentTransaction<
  KeyValue extends KeyValueLookup,
  Layer extends LayerRange
> implements LayeredStorageSegmentTransaction<KeyValue, Layer> {
  private readonly _transactionCore: TransactionCore<KeyValue, Layer>;

  /**
   * Create a new transaction for a segment of given storage.
   *
   * @param storageCore - The core that this instance will save mutations to.
   * @param listeners - Listeners that should be notified after a transaction
   * was commited.
   * @param _segment - The segment this instance will manage.
   */
  public constructor(
    storageCore: LayeredStorageCore<KeyValue, Layer>,
    listeners: Listeners<keyof KeyValue>,
    private readonly _segment: Segment
  ) {
    this._transactionCore = new TransactionCore(storageCore, listeners);
  }

  /** @inheritdoc */
  public set<Key extends keyof KeyValue>(
    layer: Layer,
    key: Key,
    value: KeyValue[Key]
  ): void {
    return this._transactionCore.set(layer, this._segment, key, value);
  }

  /** @inheritdoc */
  public delete<Key extends keyof KeyValue>(layer: Layer, key: Key): void {
    return this._transactionCore.delete(layer, this._segment, key);
  }

  /** @inheritdoc */
  public commit(): void {
    return this._transactionCore.commit();
  }

  /** @inheritdoc */
  public abort(): void {
    return this._transactionCore.revert();
  }
}
