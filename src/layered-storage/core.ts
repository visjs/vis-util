import { KeyValueLookup, LayerRange, Segment } from "./common";

const reverseNumeric = (a: number, b: number): number => b - a;

type SegmentData<KeyValue extends KeyValueLookup> = Map<
  keyof KeyValue,
  KeyValue[keyof KeyValue]
>;
type LayerData<KeyValue extends KeyValueLookup> = Map<
  Segment,
  SegmentData<KeyValue>
>;
type Data<KeyValue extends KeyValueLookup, Layer extends LayerRange> = Map<
  Layer,
  LayerData<KeyValue>
>;

interface TypedMap<KeyValue extends KeyValueLookup>
  extends Map<keyof KeyValue, KeyValue[keyof KeyValue]> {
  get<Key extends keyof KeyValue>(key: Key): undefined | KeyValue[Key];
  set<Key extends keyof KeyValue>(key: Key, value: KeyValue[Key]): this;
}

/**
 * Internal core to handle simple data storage, mutation and retrieval. Also
 * handles the special monolithic segment.
 *
 * @typeparam KeyValue - Sets the value types associeated with their keys.
 * (TS only, ignored in JS).
 * @typeparam Layer - Sets the allowed layers.
 * (TS only, ignored in JS).
 */
export class LayeredStorageCore<
  KeyValue extends KeyValueLookup,
  Layer extends LayerRange
> {
  /**
   * This is a special segment that is used as fallback if the requested
   * segment doesn't have a value in given layer.
   */
  public monolithic = Symbol("Monolithic");

  /**
   * Data stored as layer → segment → key → value.
   */
  private _data: Data<KeyValue, Layer> = new Map();

  /**
   * An ordered list of layers. The highest priority (equals highest number)
   * layer is first.
   */
  private _layers: Layer[] = [];

  /**
   * A set of segments that keeps track what segments have data in the storage.
   */
  private readonly _segments = new Set<Segment>();

  /**
   * A list of validators for each key.
   */
  private readonly _validators: TypedMap<
    {
      [Key in keyof KeyValue]: ((value: KeyValue[Key]) => true | string)[];
    }
  > = new Map();

  /**
   * This is called whenever a validity test fails.
   *
   * @param key - The key of the invalid value.
   * @param value - The invalid value itself.
   * @param message - The message returned by the validator that failed.
   */
  private _invalidHandler: <Key extends keyof KeyValue>(
    key: Key,
    value: KeyValue[Key],
    message: string
  ) => void = (key, value, message): void => {
    console.error("Invalid value was ignored.", { key, value, message });
  };

  /**
   * This is used to speed up retrieval of data upon request. Since the storage
   * is seen as mostly static this structure is populated up front and updated
   * with each change. Thanks to this quering data from the storage is always
   * just `Map.get().get()` away.
   */
  private readonly _topLevelCache = new Map<
    Segment,
    Map<keyof KeyValue, { has: boolean; value: KeyValue[keyof KeyValue] }>
  >();

  /**
   * Remove outdated values from the cache.
   *
   * @param key - The key that was subject to the mutation.
   */
  private _cleanCache(key: keyof KeyValue): void {
    // Run the search for each segment to clean the cached top level value for
    // each of them.
    for (const segment of this._segments) {
      const sCache = this._topLevelCache.get(segment);

      if (!sCache) {
        // This segment has no cache yet.
        continue;
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
   * Find a top level value.
   *
   * @param segment - Which segment to look into (monolithic is always used as
   * fallback on each level).
   * @param key - The key identifying requested value.
   *
   * @returns Whether such value exists (`has`) and the value itself (`value`).
   */
  private _findValue<Key extends keyof KeyValue>(
    segment: Segment,
    key: Key
  ): { has: boolean; value: KeyValue[Key] | undefined } {
    const segmentCache =
      this._topLevelCache.get(segment) ||
      this._topLevelCache.set(segment, new Map()).get(segment)!;

    // Return cached value if it exists.
    const cached = segmentCache.get(key);
    if (cached) {
      return cached;
    }

    // Search the layers from highest to lowest priority.
    for (const layer of this._layers) {
      // Check the segmented first and quit if found.
      const layerData = this._data.get(layer);
      if (layerData == null) {
        // Empty layer.
        continue;
      }

      const segmentData = layerData.get(segment);
      if (segmentData != null && segmentData.has(key)) {
        const value = { has: true, value: segmentData.get(key)! };

        // Save to the cache.
        segmentCache.set(key, value);

        return value;
      }

      // Check the monolithic and quit if found.
      const monolithicData = layerData.get(this.monolithic);
      if (monolithicData != null && monolithicData.has(key)) {
        const value = { has: true, value: monolithicData.get(key)! };

        // Save to the cache.
        segmentCache.set(key, value);

        return value;
      }
    }

    // If nothing was found by now there are no values for the key.
    return { has: false, value: undefined };
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
  ): { layerData: LayerData<KeyValue>; segmentData: SegmentData<KeyValue> } {
    // Get or create the requested layer.
    let layerData = this._data.get(layer);
    if (layerData == null) {
      layerData = new Map();
      this._data.set(layer, layerData);

      this._layers = [...this._data.keys()].sort(reverseNumeric);
    }

    // Get or create the requested segment on the layer.
    let segmentData = layerData.get(segment);
    if (segmentData == null) {
      segmentData = new Map();
      layerData.set(segment, segmentData);

      this._segments.add(segment);
    }

    return { layerData, segmentData };
  }

  /**
   * Retrieve a value.
   *
   * @param segment - Which segment to search through in addition to the monolithic part of the storage.
   * @param key - The key corresponding to the requested value.
   *
   * @returns The value or undefined if not found.
   */
  public get<Key extends keyof KeyValue>(
    segment: Segment,
    key: Key
  ): KeyValue[Key] | undefined {
    return this._findValue(segment, key).value;
  }

  /**
   * Check if a value is present.
   *
   * @param segment - Which segment to search through in addition to the monolithic part of the storage.
   * @param key - The key corresponding to the requested value.
   *
   * @returns True if found, false otherwise.
   */
  public has<Key extends keyof KeyValue>(segment: Segment, key: Key): boolean {
    return this._findValue(segment, key).has;
  }

  /**
   * Save a value.
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
    if (typeof layer !== "number") {
      throw new TypeError("Layers have to be numbers.");
    }

    for (const validator of this._validators.get(key) || []) {
      const message = validator(value);
      if (message === true) {
        // The value is valid. Proceed with another test or save the value into
        // the storage if this was the last one.
        continue;
      } else {
        // The value is invalid. Call the invalid value handler and, if the
        // handler didn't throw, stop execution of this function to prevent the
        // value from being saved into the storage.
        this._invalidHandler(key, value, message);
        return;
      }
    }

    const { segmentData } = this._getLSData(layer, segment);
    segmentData.set(key, value);

    this._cleanCache(key);
  }

  /**
   * Delete a value from the storage.
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

    this._cleanCache(key);
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
    handler: <Key extends keyof KeyValue>(
      key: Key,
      value: KeyValue[Key],
      message: string
    ) => void
  ): void {
    this._invalidHandler = handler;
  }

  /**
   * Add validators for given key.
   *
   * @param key - The key whose values will be validated by this validator.
   * @param validators - The functions that return true if valid or a string
   * explaining what's wrong with the value.
   */
  public addValidators<Key extends keyof KeyValue>(
    key: Key,
    ...validators: ((value: KeyValue[Key]) => true | string)[]
  ): void {
    (this._validators.get(key) || this._validators.set(key, []).get(key)!).push(
      ...validators
    );
  }

  /**
   * Log the content of the storage into the console.
   */
  public dumpContent(): void {
    console.groupCollapsed("Storage content dump");

    console.log("Time:", new Date());
    console.log("Layers:", [...this._layers.values()]);
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
    for (const [layer, lData] of this._data.entries()) {
      console.groupCollapsed(`Layer: ${layer}`);
      for (const [segment, segmentData] of lData.entries()) {
        console.groupCollapsed(`Segment: ${String(segment)}`);
        for (const [key, value] of segmentData.entries()) {
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
