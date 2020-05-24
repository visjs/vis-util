import {
  KeyRange,
  KeyValueEntry,
  KeyValueLookup,
  LayerRange,
  Segment,
} from "./common";

const entriesByKeyPriority = (
  a: [number, unknown],
  b: [number, unknown]
): number => b[0] - a[0];

type SegmentData<
  KV extends KeyValueLookup<Keys>,
  Keys extends KeyRange = keyof KV
> = TypedMap<KV, Keys>;
type LayerData<KV extends KeyValueLookup<Keys>, Keys extends KeyRange> = Map<
  Segment,
  SegmentData<KV, Keys>
>;
type Data<
  Layer extends LayerRange,
  KV extends KeyValueLookup<Keys>,
  Keys extends KeyRange = keyof KV
> = Map<Layer, LayerData<KV, Keys>>;

interface TypedMap<
  KV extends Record<Keys, any>,
  Keys extends KeyRange = keyof KV
> extends Map<Keys, KV[Keys]> {
  get<Key extends Keys>(key: Key): undefined | KV[Key];
  set<Key extends Keys>(key: Key, value: KV[Key]): this;
}

/**
 * Internal core to handle simple data storage, mutation and retrieval. Also
 * handles the special global segment.
 *
 * @typeParam Layer - The allowed layers.
 * (TS only, ignored in JS).
 * @typeParam KV - The value types associeated with their keys.
 * (TS only, ignored in JS).
 * @typeParam Keys - The allowed keys.
 * (TS only, ignored in JS).
 */
export class LayeredStorageCore<
  Layer extends LayerRange,
  KV extends KeyValueLookup<Keys>,
  Keys extends KeyRange = keyof KV
> {
  /**
   * This is a special segment that is used as fallback if the requested
   * segment doesn't have a value in given layer.
   */
  public readonly globalSegment = Symbol("Global Segment");

  /**
   * Data stored as layer → segment → key → value.
   */
  private readonly _data: Data<Layer, KV, Keys> = new Map();

  /**
   * An ordered list of layer datas. The highest priority (equals highest
   * number) layer is first.
   */
  private _layerDatas: LayerData<KV, Keys>[] = [];

  /**
   * A set of segments that keeps track what segments have data in the storage.
   */
  private readonly _segments = new Set<Segment>();

  /**
   * A list of validators for each key.
   */
  private readonly _validators: TypedMap<
    {
      [Key in Keys]: ((value: KV[Key]) => true | string)[];
    },
    Keys
  > = new Map();

  /**
   * An expander for each key.
   */
  private readonly _setExpanders: TypedMap<
    {
      [Key in Keys]: (value: KV[Key]) => readonly KeyValueEntry<KV, Keys>[];
    },
    Keys
  > = new Map();

  /**
   * An expander for each key.
   */
  private readonly _deleteExpanders: Map<Keys, readonly Keys[]> = new Map();

  /**
   * This is called whenever a validity test fails.
   *
   * @param key - The key of the invalid value.
   * @param value - The invalid value itself.
   * @param message - The message returned by the validator that failed.
   */
  private _invalidHandler: <Key extends Keys>(
    key: Key,
    value: KV[Key],
    message: string
  ) => void = (key, value, message): void => {
    console.error("Invalid value was ignored.", { key, value, message });
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
    TypedMap<{ [Key in Keys]: KV[Key] | null }, Keys>
  >();

  /**
   * Remove outdated values from the cache.
   *
   * @param segment - Which segment to clean.
   * @param key - The key that was subject to the mutation.
   */
  private _cleanCache(segment: Segment, key: Keys): void {
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
  ): { layerData: LayerData<KV, Keys>; segmentData: SegmentData<KV, Keys> } {
    // Get or create the requested layer.
    let layerData = this._data.get(layer);
    if (typeof layerData === "undefined") {
      layerData = new Map();
      this._data.set(layer, layerData);

      this._layerDatas = [...this._data.entries()]
        .sort(entriesByKeyPriority)
        .map((pair): LayerData<KV, Keys> => pair[1]);
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
   * @param segment - Which segment to search through in addition to the global
   * segment which is used as the fallback on each level.
   * @param key - The key corresponding to the requested value.
   *
   * @returns The value or undefined if it wasn't found.
   */
  public get<Key extends Keys>(
    segment: Segment,
    key: Key
  ): KV[Key] | undefined {
    let segmentCache = this._topLevelCache.get(segment);
    if (typeof segmentCache === "undefined") {
      segmentCache = new Map();
      this._topLevelCache.set(segment, segmentCache);
    }

    // Return cached value if it exists.
    const cached = segmentCache.get(key);
    if (typeof cached !== "undefined") {
      // TODO: The non null assertion shouldn't be necessary.
      return cached === null ? void 0 : cached!;
    }

    // Search the layers from highest to lowest priority.
    for (const layerData of this._layerDatas) {
      if (typeof layerData === "undefined") {
        // Empty layer.
        continue;
      }

      // Check the segment and quit if found.
      const segmentData = layerData.get(segment);
      if (typeof segmentData !== "undefined") {
        const value = segmentData.get(key);
        if (typeof value !== "undefined") {
          // Save to the cache.
          segmentCache.set(key, value);

          return value;
        }
      }

      // Check the global segment and quit if found.
      const globalData = layerData.get(this.globalSegment);
      if (typeof globalData !== "undefined") {
        const value = globalData.get(key);
        if (typeof value !== "undefined") {
          // Save to the cache.
          segmentCache.set(key, value);

          return value;
        }
      }
    }

    // If nothing was found by now there are no values for the key.

    // Save to the cache.
    segmentCache.set(key, null);

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
  public has<Key extends Keys>(segment: Segment, key: Key): boolean {
    return typeof this.get(segment, key) !== "undefined";
  }

  /**
   * Save a value.
   *
   * @param layer - Which layer to save the value into.
   * @param segment - Which segment to save the value into.
   * @param key - Key that can be used to retrieve or overwrite this value later.
   * @param value - The value to be saved.
   */
  public set<Key extends Keys>(
    layer: Layer,
    segment: Segment,
    key: Key,
    value: KV[Key]
  ): void {
    if (typeof layer !== "number") {
      throw new TypeError("Layers have to be numbers.");
    }

    const validators = this._validators.get(key);
    if (validators) {
      for (const validator of validators) {
        const message = validator(value);
        if (message === true) {
          // The value is valid. Proceed with another test or save the value
          // into the storage if this was the last one.
          continue;
        } else {
          // The value is invalid. Call the invalid value handler and, if the
          // handler didn't throw, stop execution of this function to prevent
          // the value from being saved into the storage.
          this._invalidHandler(key, value, message);
          return;
        }
      }
    }

    const { segmentData } = this._getLSData(layer, segment);
    segmentData.set(key, value);

    this._cleanCache(segment, key);
  }

  /**
   * Delete a value from the storage.
   *
   * @param layer - Which layer to delete from.
   * @param segment - Which segment to delete from.
   * @param key - The key that identifies the value to be deleted.
   */
  public delete<Key extends Keys>(
    layer: Layer,
    segment: Segment,
    key: Key
  ): void {
    if (typeof layer !== "number") {
      throw new TypeError("Layers have to be numbers.");
    }

    const { layerData, segmentData } = this._getLSData(layer, segment);
    segmentData.delete(key);

    // Purge the segment if empty.
    if (segmentData.size === 0) {
      layerData.delete(segment);
    }

    // Purge the layer if empty.
    if (layerData.size === 0) {
      this._data.delete(layer);
    }

    this._cleanCache(segment, key);
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
        const sourceSegmentCopy: SegmentData<KV, Keys> = new Map();
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
  }

  /**
   * Set a handler for invalid values.
   *
   * @param handler - The function that will be called with the key, invalid
   * value and a message from the failed validator.
   */
  public setInvalidHandler(
    handler: <Key extends Keys>(
      key: Key,
      value: KV[Key],
      message: string
    ) => void
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
  public setValidators<Key extends Keys>(
    key: Key,
    validators: ((value: KV[Key]) => true | string)[],
    replace: boolean
  ): void {
    if (!replace && this._validators.has(key)) {
      throw new Error("Some validators for this key already exist.");
    }

    this._validators.set(key, validators);
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
  public setExpander<Key extends Keys, Affects extends Keys>(
    key: Key,
    affects: readonly Affects[],
    expander: (value: KV[Key]) => readonly KeyValueEntry<KV, Affects>[],
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
   * Expand given value.
   *
   * @param key - Which key this value belongs to.
   * @param value - The value to be expanded.
   *
   * @throws If the value is invalid and the invalid handler throws.
   *
   * @returns Expanded key value pairs or empty array for invalid input.
   */
  public expandSet<Key extends Keys>(
    key: Key,
    value: KV[Key]
  ): readonly KeyValueEntry<KV, Keys>[] {
    const validators = this._validators.get(key);
    if (validators) {
      for (const validator of validators) {
        const message = validator(value);
        if (message === true) {
          // The value is valid. Proceed with another test or save the value
          // into the storage if this was the last one.
          continue;
        } else {
          // The value is invalid. Call the invalid value handler and, if the
          // handler didn't throw, stop execution of this function to prevent
          // the value from being saved into the storage.
          this._invalidHandler(key, value, message);
          return [];
        }
      }
    }

    const expand = this._setExpanders.get(key);
    if (expand) {
      return expand(value);
    } else {
      return [[key, value]];
    }
  }

  /**
   * Expand given value.
   *
   * @param key - Which key this value belongs to.
   *
   * @returns Expanded key value pairs or empty array for invalid input.
   */
  public expandDelete<Key extends Keys>(key: Key): readonly Keys[] {
    return this._deleteExpanders.get(key) || [key];
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
