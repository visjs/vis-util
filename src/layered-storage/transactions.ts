import {
  KeyRange,
  KeyValueLookup,
  LayerRange,
  Segment,
  EventCallback
} from "./common";
import { LayeredStorageCore } from "./core";

export type Listener<Key> = {
  test: (key: KeyRange) => boolean;
  callback: EventCallback<Key>;
};
export type Listeners<Key> = Map<Segment, Listener<Key>[]>;

class TransactionCore<
  KeyValue extends KeyValueLookup,
  Layer extends LayerRange
> {
  private _actions: (() => void)[] = [];
  private _events = new Map<Segment, Set<keyof KeyValue>>();

  public constructor(
    private _core: LayeredStorageCore<KeyValue, Layer>,
    private _listeners: Listeners<keyof KeyValue>
  ) {}

  public set<Key extends keyof KeyValue>(
    layer: Layer,
    segment: Segment,
    key: Key,
    value: KeyValue[Key]
  ): void {
    this._actions.push(
      this._core.set.bind(this._core, layer, segment, key, value)
    );

    this._addEvent(segment, key);
  }

  public delete<Key extends keyof KeyValue>(
    layer: Layer,
    segment: Segment,
    key: Key
  ): void {
    this._actions.push(this._core.delete.bind(this._core, layer, segment, key));

    this._addEvent(segment, key);
  }

  public commit(): void {
    const actions = this._actions;
    this._actions = [];
    const events = this._events;
    this._events = new Map();

    actions.forEach((action): void => {
      action();
    });

    const monolithicKeySet = events.get(this._core.monolithic);
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

      events.delete(this._core.monolithic);
    }

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

  public revert(): void {
    this._actions = [];
    this._events = new Map();
  }

  private _addEvent(segment: Segment, key: keyof KeyValue): void {
    (
      this._events.get(segment) ||
      this._events.set(segment, new Set()).get(segment)!
    ).add(key);
  }
}

export interface LayeredStorageTransaction<
  KeyValue extends KeyValueLookup,
  Layer extends LayerRange
> {
  set<Key extends keyof KeyValue>(
    layer: Layer,
    segment: Segment,
    key: Key,
    value: KeyValue[Key]
  ): void;
  set<Key extends keyof KeyValue>(
    layer: Layer,
    key: Key,
    value: KeyValue[Key]
  ): void;

  delete<Key extends keyof KeyValue>(
    layer: Layer,
    segment: Segment,
    key: Key
  ): void;
  delete<Key extends keyof KeyValue>(layer: Layer, key: Key): void;

  commit(): void;

  revert(): void;
}

export class MonolithicTransaction<
  KeyValue extends KeyValueLookup,
  Layer extends LayerRange
> implements LayeredStorageTransaction<KeyValue, Layer> {
  private readonly _transactionCore: TransactionCore<KeyValue, Layer>;

  public constructor(
    private readonly _storageCore: LayeredStorageCore<KeyValue, Layer>,
    private readonly _listeners: Listeners<keyof KeyValue>
  ) {
    this._transactionCore = new TransactionCore(
      this._storageCore,
      this._listeners
    );
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
    return rest.length === 3
      ? this._transactionCore.set(
          rest[0],
          this._storageCore.monolithic,
          rest[1],
          rest[2]
        )
      : this._transactionCore.set(rest[0], rest[1], rest[2], rest[3]);
  }

  public delete<Key extends keyof KeyValue>(
    layer: Layer,
    segment: Segment,
    key: Key
  ): void;
  public delete<Key extends keyof KeyValue>(layer: Layer, key: Key): void;
  public delete<Key extends keyof KeyValue>(
    ...rest: [Layer, Segment, Key] | [Layer, Key]
  ): void {
    return rest.length === 2
      ? this._transactionCore.delete(
          rest[0],
          this._storageCore.monolithic,
          rest[1]
        )
      : this._transactionCore.delete(rest[0], rest[1], rest[2]);
  }

  public commit(): void {
    return this._transactionCore.commit();
  }

  public revert(): void {
    return this._transactionCore.revert();
  }
}

export interface LayeredStorageSegmentTransaction<
  KeyValue extends KeyValueLookup,
  Layer extends LayerRange
> {
  set<Key extends keyof KeyValue>(
    layer: Layer,
    key: Key,
    value: KeyValue[Key]
  ): void;

  delete<Key extends keyof KeyValue>(layer: Layer, key: Key): void;

  commit(): void;

  revert(): void;
}

export class SegmentTransaction<
  KeyValue extends KeyValueLookup,
  Layer extends LayerRange
> implements LayeredStorageSegmentTransaction<KeyValue, Layer> {
  private readonly _transactionCore: TransactionCore<KeyValue, Layer>;

  public constructor(
    private readonly _storageCore: LayeredStorageCore<KeyValue, Layer>,
    private readonly _listeners: Listeners<keyof KeyValue>,
    private readonly _segment: Segment
  ) {
    this._transactionCore = new TransactionCore(
      this._storageCore,
      this._listeners
    );
  }

  public set<Key extends keyof KeyValue>(
    layer: Layer,
    key: Key,
    value: KeyValue[Key]
  ): void {
    return this._transactionCore.set(layer, this._segment, key, value);
  }

  public delete<Key extends keyof KeyValue>(layer: Layer, key: Key): void {
    return this._transactionCore.delete(layer, this._segment, key);
  }

  public commit(): void {
    return this._transactionCore.commit();
  }

  public revert(): void {
    return this._transactionCore.revert();
  }
}
