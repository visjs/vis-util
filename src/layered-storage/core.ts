import {
  KeyRange,
  KeyValueEntry,
  KeyValueLookup,
  LayerRange,
  Segment,
} from "./common";
import { LayeredStorageValidator } from "./validator-library";

const entriesByKeyPriority = (
  a: [number, unknown],
  b: [number, unknown]
): number => b[0] - a[0];

type SegmentData<KV extends KeyValueLookup> = TypedMap<KV>;
type LayerData<KV extends KeyValueLookup> = Map<Segment, SegmentData<KV>>;
type Data<Layer extends LayerRange, KV extends KeyValueLookup> = Map<
  Layer,
  LayerData<KV>
>;

interface TypedMap<KV extends Record<KeyRange, any>>
  extends Map<keyof KV, KV[keyof KV]> {
  get<Key extends keyof KV>(key: Key): undefined | KV[Key];
  set<Key extends keyof KV>(key: Key, value: KV[Key]): this;
}

export type LayeredStorageInvalidValueHandler<Keys extends KeyRange> = (
  key: Keys,
  value: unknown,
  messages: string[]
) => void;

/**
 * Internal core to handle simple data storage, mutation and retrieval. Also
 * handles the special global segment.
 *
 * @typeParam Layer - The allowed layers.
 * @typeParam IKV - The value types associeated with their keys on input (set).
 * @typeParam OKV - The value types associeated with their keys on output (get,
 * export).
 */
export class LayeredStorageCore<
  Layer extends LayerRange,
  IKV extends OKV,
  OKV extends KeyValueLookup
> {
  /**
   * This is a special segment that is used as fallback if the requested
   * segment doesn't have a value in given layer.
   */
  public readonly globalSegment = Symbol("Global Segment");

  /**
   * Data stored as layer → segment → key → value.
   */
  private readonly _data: Data<Layer, OKV> = new Map();

  /**
   * An ordered list of layer datas. The highest priority (equals highest
   * number) layer is first.
   */
  private _layerDatas: LayerData<OKV>[] = [];

  /**
   * A set of segments that keeps track what segments have data in the storage.
   */
  private readonly _segments = new Set<Segment>();

  /**
   * Segment inheritance chains.
   *
   * @remarks
   * The first element always has to be the segment itself:
   * [this segment, ...ancestors, global segment]
   */
  private readonly _inheritance = new Map<Segment, Segment[]>();

  /**
   * A list of validators for each key.
   */
  private readonly _validators: TypedMap<
    {
      [Key in keyof IKV]: LayeredStorageValidator[];
    }
  > = new Map();

  /**
   * An expander for each key.
   */
  private readonly _setExpanders: TypedMap<
    {
      [Key in keyof IKV]: (
        value: IKV[Key]
      ) => readonly KeyValueEntry<OKV, keyof OKV>[];
    }
  > = new Map();

  /**
   * An expander for each key.
   */
  private readonly _deleteExpanders: Map<
    keyof IKV,
    readonly (keyof OKV)[]
  > = new Map();

  /**
   * This is called whenever a validity test fails.
   *
   * @param key - The key of the invalid value.
   * @param value - The invalid value itself.
   * @param messages - All the message returned by the validators that failed.
   */
  private _invalidHandler: LayeredStorageInvalidValueHandler<keyof IKV> = (
    key,
    value,
    messages
  ): void => {
    console.error("Invalid value was ignored.", { key, value, messages });
  };

  /**
   * This is used to speed up retrieval of data upon request. Thanks to this
   * quering data from the storage is almost always just `Map.get().get()` away.
   *
   * @remarks
   * The `null` stands for value that was looked up but is not set.
   */
  private readonly _topLevelCache = new Map<
    Segment,
    TypedMap<{ [Key in keyof OKV]: OKV[Key] | null }>
  >();

  /**
   * Remove outdated values from the cache.
   *
   * @param segment - Which segment to clean.
   * @param key - The key that was subject to the mutation.
   */
  private _cleanCache(segment: Segment, key: keyof OKV): void {
    if (segment === this.globalSegment) {
      // Run the search for each cached segment to clean the cached top level
      // value for each of them. The reason for this is that the global segment
      // affects all other segments.
      for (const cache of this._topLevelCache) {
        const sCache = cache[1];

        // Delete the outdated value.
        sCache.delete(key);

        // Delete the whole segment if empty.
        if (sCache.size === 0) {
          this._topLevelCache.delete(cache[0]);
        }
      }
    } else {
      // Clean only the relevant segment.
      const sCache = this._topLevelCache.get(segment);

      if (!sCache) {
        // This segment has no cache yet.
        return;
      }

      // Delete the outdated value.
      sCache.delete(key);

      // Delete the whole segment if empty.
      if (sCache.size === 0) {
        this._topLevelCache.delete(segment);
      }
    }
  }

  /**
   * Fetch the key value map for given segment on given layer. Nonexistent
   * layers and segments will be automatically created and the new instances
   * returned.
   *
   * @param layer - Which layer to fetch.
   * @param segment - Which segment to fetch from fetched layer.
   *
   * @returns Key value map.
   */
  private _getLSData(
    layer: Layer,
    segment: Segment
  ): { layerData: LayerData<OKV>; segmentData: SegmentData<OKV> } {
    // Get or create the requested layer.
    let layerData = this._data.get(layer);
    if (typeof layerData === "undefined") {
      layerData = new Map();
      this._data.set(layer, layerData);

      this._layerDatas = [...this._data.entries()]
        .sort(entriesByKeyPriority)
        .map((pair): LayerData<OKV> => pair[1]);
    }

    // Get or create the requested segment on the layer.
    let segmentData = layerData.get(segment);
    if (typeof segmentData === "undefined") {
      segmentData = new Map();
      layerData.set(segment, segmentData);

      this._segments.add(segment);
    }

    return { layerData, segmentData };
  }

  /**
   * Retrieve a value.
   *
   * @param thisSegment - Which segment to search through in addition to the global
   * segment which is used as the fallback on each level.
   * @param key - The key corresponding to the requested value.
   *
   * @returns The value or undefined if it wasn't found.
   */
  public get<Key extends keyof OKV>(
    thisSegment: Segment,
    key: Key
  ): OKV[Key] | undefined {
    let thisSegmentCache = this._topLevelCache.get(thisSegment);
    if (typeof thisSegmentCache === "undefined") {
      thisSegmentCache = new Map();
      this._topLevelCache.set(thisSegment, thisSegmentCache);
    }

    // Return cached value if it exists.
    const cached = thisSegmentCache.get(key);
    if (typeof cached !== "undefined") {
      // TODO: The non null assertion shouldn't be necessary.
      return cached === null ? void 0 : cached!;
    }

    // Fetch the inheritance chain.
    const segments = this._inheritance.get(thisSegment) || [
      thisSegment,
      this.globalSegment,
    ];

    // Search the layers from highest to lowest priority.
    for (const layerData of this._layerDatas) {
      if (typeof layerData === "undefined") {
        // Empty layer.
        continue;
      }

      // Search the inheritance chain.
      for (const segment of segments) {
        // Check the segment and quit if found.
        const segmentData = layerData.get(segment);
        if (typeof segmentData === "undefined") {
          // Empty segment on this layer.
          continue;
        }

        const value = segmentData.get(key);
        if (typeof value === "undefined") {
          // No value for this segment on this layer.
          continue;
        }

        // Save to the cache.
        thisSegmentCache.set(key, value);

        return value;
      }
    }

    // If nothing was found by now there are no values for the key.

    // Save to the cache.
    thisSegmentCache.set(key, null);

    // Return the empty value.
    return;
  }

  /**
   * Check if a value is present.
   *
   * @param segment - Which segment to search through in addition to the global
   * segment which is used as the fallback on each level.
   * @param key - The key corresponding to the requested value.
   *
   * @returns True if found, false otherwise.
   */
  public has<Key extends keyof OKV>(segment: Segment, key: Key): boolean {
    return typeof this.get(segment, key) !== "undefined";
  }

  /**
   * Validate and expand the value now and set it later.
   *
   * @param layer - Which layer to save the value into.
   * @param segment - Which segment to save the value into.
   * @param key - Key that can be used to retrieve or overwrite this value later.
   * @param value - The value to be saved.
   *
   * @returns Function that actually sets the validated and expanded value.
   */
  public twoPartSet<Key extends keyof IKV>(
    layer: Layer,
    segment: Segment,
    key: Key,
    value: IKV[Key]
  ): () => void {
    if (typeof layer !== "number") {
      throw new TypeError("Layers have to be numbers.");
    }

    if (!this._validate(key, value)) {
      // The value is invalid. If the invalid value handler didn't throw, return
      // empty function to prevent the value from being saved into the storage.
      return (): void => {};
    }

    const expandedEntries = this._expand(key, value)
      // The invalid value handler may throw here and abort everything otherwise
      // skip just the invalid ones.
      .filter((expandedEntry): boolean =>
        this._validate(expandedEntry[0], expandedEntry[1])
      );

    // The value is valid. It can be safely saved into the storage.
    return (): void => {
      const { segmentData } = this._getLSData(layer, segment);

      for (const expandedEntry of expandedEntries) {
        segmentData.set(expandedEntry[0], expandedEntry[1]);
        this._cleanCache(segment, expandedEntry[0]);
      }
    };
  }

  /**
   * Delete a value from the storage.
   *
   * @param layer - Which layer to delete from.
   * @param segment - Which segment to delete from.
   * @param key - The key that identifies the value to be deleted.
   *
   * @returns Function that actually deletes the values.
   */
  public twoPartDelete<Key extends keyof IKV>(
    layer: Layer,
    segment: Segment,
    key: Key
  ): () => void {
    if (typeof layer !== "number") {
      throw new TypeError("Layers have to be numbers.");
    }

    return (): void => {
      const { layerData, segmentData } = this._getLSData(layer, segment);

      const expandedKeys = this._deleteExpanders.get(key) || [key];
      for (const expandedKey of expandedKeys) {
        segmentData.delete(expandedKey);
      }

      // Purge the segment if empty.
      if (segmentData.size === 0) {
        layerData.delete(segment);
      }

      // Purge the layer if empty.
      if (layerData.size === 0) {
        this._data.delete(layer);
      }

      for (const expandedKey of expandedKeys) {
        this._cleanCache(segment, expandedKey);
      }
    };
  }

  /**
   * Set the inherance chain of given segment.
   *
   * @param segment - The segment that will inherit.
   * @param segments - The segments from which will be inherited.
   * @param global - Whether to inherit from global (as is the default) or not.
   */
  public setInheritance(
    segment: Segment,
    segments: Segment[],
    global = true
  ): void {
    this._inheritance.set(
      segment,
      global
        ? [segment, ...segments, this.globalSegment]
        : [segment, ...segments]
    );

    // Inheritance can affect anything, delete the whole cache for this segment.
    this._topLevelCache.delete(segment);
  }

  /**
   * Export data in an object format.
   *
   * @remarks
   * All values will be fully expanded, all defaults will be applied etc. It's
   * like fetching all of them through .get().
   *
   * @param segment - Which segment's data to export.
   * @param compoundKeys - The keys to export.
   *
   * @returns Object representation of given segments' current data for given
   * keys.
   */
  public exportToObject(segment: Segment, compoundKeys: (keyof OKV)[]): any {
    const result: any = {};

    for (const compoundKey of compoundKeys) {
      if (typeof compoundKey === "string") {
        let obj = result;

        const keyParts = compoundKey.split(".");
        const key = keyParts.pop()!; // String.split() will always have at leas one member.

        for (const keyPart of keyParts) {
          obj[keyPart] = obj[keyPart] || {};
          obj = obj[keyPart];
        }

        obj[key] = this.get(segment, compoundKey);
      } else {
        result[compoundKey] = this.get(segment, compoundKey);
      }
    }

    return result;
  }

  /**
   * Clone all data from one segment to another.
   *
   * @param sourceSegment - The existing segment to be cloned.
   * @param targetSegment - The target segment which should be created.
   *
   * @throws If the target segment already exists.
   */
  public cloneSegmentData(
    sourceSegment: Segment,
    targetSegment: Segment
  ): void {
    if (this._segments.has(targetSegment)) {
      throw new Error(
        "The target segment already exists. If this was intentional delete it's data before cloning, please."
      );
    }

    for (const layerData of this._data.values()) {
      const sourceSegmentData = layerData.get(sourceSegment);
      if (sourceSegmentData) {
        const sourceSegmentCopy: SegmentData<OKV> = new Map();
        for (const entry of sourceSegmentData.entries()) {
          sourceSegmentCopy.set(entry[0], entry[1]);
        }
        layerData.set(targetSegment, sourceSegmentCopy);
      }
    }

    this._segments.add(targetSegment);
  }

  /**
   * Delete all the data associeated with given segment.
   *
   * @remarks
   * New data can be saved into the storage for the same segment right away.
   * Also calling this with nonexistent segment or with segment that has no
   * data is fine.
   *
   * @param segment - The segment whose data should be deleted.
   */
  public deleteSegmentData(segment: Segment): void {
    for (const layerData of this._data.values()) {
      layerData.delete(segment);
    }
    this._topLevelCache.delete(segment);
    this._segments.delete(segment);
    this._inheritance.delete(segment);
  }

  /**
   * Set a handler for invalid values.
   *
   * @param handler - The function that will be called with the key, invalid
   * value and a message from the failed validator.
   */
  public setInvalidHandler(
    handler: LayeredStorageInvalidValueHandler<keyof IKV>
  ): void {
    this._invalidHandler = handler;
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
  public setValidators<Key extends keyof IKV>(
    key: Key,
    validators: LayeredStorageValidator[],
    replace: boolean
  ): void {
    if (!replace && this._validators.has(key)) {
      throw new Error("Some validators for this key already exist.");
    }

    this._validators.set(key, validators);
  }

  /**
   * Validate given value for given key.
   *
   * @param key - The key whose validators should be used.
   * @param value - The value to be validated.
   *
   * @returns True if valid, false otherwise.
   */
  public _validate<Key extends keyof IKV>(key: Key, value: IKV[Key]): boolean {
    const messages = [];

    const validators = this._validators.get(key);
    if (validators) {
      for (const validator of validators) {
        const message = validator(value) || validator.description;
        if (message !== true) {
          // The value is invalid. Call the invalid value handler and, if the
          // handler didn't throw, return empty function to prevent the value
          // from being saved into the storage.
          messages.push(message);
        }
      }
    }

    if (messages.length) {
      this._invalidHandler(key, value, messages);
    }

    return !messages.length;
  }

  /**
   * Expand given value.
   *
   * @param key - Which key this value belongs to.
   * @param value - The value to be expanded.
   *
   * @returns Expanded key value pairs or empty array for invalid input.
   */
  private _expand<Key extends keyof IKV>(
    key: Key,
    value: IKV[Key]
  ): readonly KeyValueEntry<OKV, keyof OKV>[] {
    const expand = this._setExpanders.get(key);
    if (typeof expand === "undefined") {
      return [[key, value]];
    } else {
      return expand(value);
    }
  }

  /**
   * Set an expander for given key.
   *
   * @remarks
   * These are used in transactions to expand keys prior to them being
   * applied. Using them here would prevent transactions from being atomic.
   *
   * @param key - The key whose values will be expanded by this expander.
   * @param affects - The expanded keys that will be returned by the
   * expaner and also deleted if this key is deleted.
   * @param expander - The functions that returns an array of expanded key
   * value pairs.
   * @param replace - If true existing expander will be replaced, if false an
   * error will be thrown if an expander already exists for given key.
   */
  public setExpander<Key extends keyof IKV, Affects extends keyof OKV>(
    key: Key,
    affects: readonly Affects[],
    expander: (value: IKV[Key]) => readonly KeyValueEntry<OKV, Affects>[],
    replace: boolean
  ): void {
    if (
      !replace &&
      (this._setExpanders.has(key) || this._deleteExpanders.has(key))
    ) {
      throw new Error("An expander for this key already exists.");
    }

    this._setExpanders.set(key, expander);
    this._deleteExpanders.set(key, affects);
  }

  /**
   * Log the content of the storage into the console.
   */
  public dumpContent(): void {
    console.groupCollapsed("Storage content dump");

    const layers = [...this._data.entries()]
      .sort(entriesByKeyPriority)
      .map((pair): Layer => pair[0]);

    console.log("Time:", new Date());
    console.log("Layers:", layers);
    console.log("Segments:", [...this._segments.values()]);

    console.groupCollapsed("Cache");
    for (const [segment, cacheData] of this._topLevelCache.entries()) {
      console.groupCollapsed(`Segment: ${String(segment)}`);
      for (const [key, value] of cacheData.entries()) {
        console.log([key, value]);
      }
      console.groupEnd();
    }
    console.groupEnd();

    console.groupCollapsed("Data");
    for (const layer of layers) {
      const lData = this._data.get(layer)!;
      console.groupCollapsed(`Layer: ${layer}`);
      for (const [segment, segmentData] of lData.entries()) {
        console.groupCollapsed(`Segment: ${String(segment)}`);
        for (const [key, value] of [...segmentData.entries()].sort()) {
          console.log([key, value]);
        }
        console.groupEnd();
      }
      console.groupEnd();
    }
    console.groupEnd();

    console.groupEnd();
  }
}
