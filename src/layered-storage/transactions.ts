import { KeyValueLookup, LayerRange, Segment } from "./common";
import { LayeredStorageCore } from "./core";

/**
 * This is used through composition to create monolithic and segmented
 * transactions without massive code duplicities.
 *
 * @typeparam KV - Sets the value types associeated with their keys.
 * (TS only, ignored in JS).
 * @typeparam Layer - Sets the allowed layers.
 * (TS only, ignored in JS).
 */
class TransactionCore<KV extends KeyValueLookup, Layer extends LayerRange> {
  /**
   * Functions that perform requested mutations when executed without any
   * arguments or this. Intended to be filled bound set and delete methods from
   * `LayeredStorageCore`.
   */
  private _actions: (() => void)[] = [];

  /**
   * Create a new instance of transaction core.
   *
   * @param _storageCore - The core that this instance will save mutations to.
   * @param _listeners - Listeners that should be notified after a transaction
   * was commited.
   */
  public constructor(private _storageCore: LayeredStorageCore<KV, Layer>) {}

  /**
   * Queue set mutation.
   *
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
  ): void {
    const expandedPairs = this._storageCore.expandSet(key, value);
    for (const expanded of expandedPairs) {
      this._actions.push(
        this._storageCore.set.bind(
          this._storageCore,
          layer,
          segment,
          expanded[0],
          expanded[1]
        )
      );
    }
  }

  /**
   * Queue delete mutation.
   *
   * @param layer - Which layer to delete from.
   * @param segment - Which segment to delete from.
   * @param key - The key that identifies the value to be deleted.
   */
  public delete<Key extends keyof KV>(
    layer: Layer,
    segment: Segment,
    key: Key
  ): void {
    for (const expandedKey of this._storageCore.expandDelete(key)) {
      this._actions.push(
        this._storageCore.delete.bind(
          this._storageCore,
          layer,
          segment,
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

/**
 * A transaction working with the whole storage.
 *
 * @typeparam KV - Sets the value types associeated with their keys.
 * (TS only, ignored in JS).
 * @typeparam Layer - Sets the allowed layers.
 * (TS only, ignored in JS).
 */
export interface LayeredStorageTransaction<
  KV extends KeyValueLookup,
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
  set<Key extends keyof KV>(
    layer: Layer,
    segment: Segment,
    key: Key,
    value: KV[Key]
  ): void;
  /**
   * Queue a value to be set.
   *
   * @param layer - Which layer to save the value into.
   * @param key - Key that can be used to retrieve or overwrite this value later.
   * @param value - The value to be saved.
   */
  set<Key extends keyof KV>(layer: Layer, key: Key, value: KV[Key]): void;

  /**
   * Queue a value to be deleted.
   *
   * @param layer - Which layer to delete from.
   * @param segment - Which segment to delete from.
   * @param key - The key that identifies the value to be deleted.
   */
  delete<Key extends keyof KV>(layer: Layer, segment: Segment, key: Key): void;
  /**
   * Queue a value to be deleted.
   *
   * @param layer - Which layer to delete from.
   * @param key - The key that identifies the value to be deleted.
   */
  delete<Key extends keyof KV>(layer: Layer, key: Key): void;

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
  KV extends KeyValueLookup,
  Layer extends LayerRange
> implements LayeredStorageTransaction<KV, Layer> {
  private readonly _transactionCore: TransactionCore<KV, Layer>;
  private readonly _monolithic: symbol;

  /**
   * Create a new transaction for given storage.
   *
   * @param storageCore - The core that this instance will save mutations to.
   * @param listeners - Listeners that should be notified after a transaction
   * was commited.
   */
  public constructor(storageCore: LayeredStorageCore<KV, Layer>) {
    this._monolithic = storageCore.monolithic;
    this._transactionCore = new TransactionCore(storageCore);
  }

  public set<Key extends keyof KV>(
    layer: Layer,
    segment: Segment,
    key: Key,
    value: KV[Key]
  ): void;
  public set<Key extends keyof KV>(
    layer: Layer,
    key: Key,
    value: KV[Key]
  ): void;
  /** @inheritdoc */
  public set<Key extends keyof KV>(
    ...rest: [Layer, Segment, Key, KV[Key]] | [Layer, Key, KV[Key]]
  ): void {
    return rest.length === 3
      ? this._transactionCore.set(rest[0], this._monolithic, rest[1], rest[2])
      : this._transactionCore.set(rest[0], rest[1], rest[2], rest[3]);
  }

  public delete<Key extends keyof KV>(
    layer: Layer,
    segment: Segment,
    key: Key
  ): void;
  public delete<Key extends keyof KV>(layer: Layer, key: Key): void;
  /** @inheritdoc */
  public delete<Key extends keyof KV>(
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
    return this._transactionCore.abort();
  }
}

/** @inheritdoc */
export interface LayeredStorageSegmentTransaction<
  KV extends KeyValueLookup,
  Layer extends LayerRange
> {
  /**
   * Queue a value to be set.
   *
   * @param layer - Which layer to save the value into.
   * @param key - Key that can be used to retrieve or overwrite this value later.
   * @param value - The value to be saved.
   */
  set<Key extends keyof KV>(layer: Layer, key: Key, value: KV[Key]): void;

  /**
   * Queue a value to be deleted.
   *
   * @param layer - Which layer to delete from.
   * @param key - The key that identifies the value to be deleted.
   */
  delete<Key extends keyof KV>(layer: Layer, key: Key): void;

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
 * @typeparam KV - Sets the value types associeated with their keys.
 * (TS only, ignored in JS).
 * @typeparam Layer - Sets the allowed layers.
 * (TS only, ignored in JS).
 */
export class SegmentTransaction<
  KV extends KeyValueLookup,
  Layer extends LayerRange
> implements LayeredStorageSegmentTransaction<KV, Layer> {
  private readonly _transactionCore: TransactionCore<KV, Layer>;

  /**
   * Create a new transaction for a segment of given storage.
   *
   * @param storageCore - The core that this instance will save mutations to.
   * @param listeners - Listeners that should be notified after a transaction
   * was commited.
   * @param _segment - The segment this instance will manage.
   */
  public constructor(
    storageCore: LayeredStorageCore<KV, Layer>,
    private readonly _segment: Segment
  ) {
    this._transactionCore = new TransactionCore(storageCore);
  }

  /** @inheritdoc */
  public set<Key extends keyof KV>(
    layer: Layer,
    key: Key,
    value: KV[Key]
  ): void {
    return this._transactionCore.set(layer, this._segment, key, value);
  }

  /** @inheritdoc */
  public delete<Key extends keyof KV>(layer: Layer, key: Key): void {
    return this._transactionCore.delete(layer, this._segment, key);
  }

  /** @inheritdoc */
  public commit(): void {
    return this._transactionCore.commit();
  }

  /** @inheritdoc */
  public abort(): void {
    return this._transactionCore.abort();
  }
}
