import { KeyValueLookup, LayerRange, Segment } from "./common";

const reverseNumeric = (a: number, b: number): number => b - a;

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
  private _data = new Map<
    Layer,
    Map<Segment, Map<keyof KeyValue, KeyValue[keyof KeyValue]>>
  >();

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
    const sCache =
      this._topLevelCache.get(segment) ||
      this._topLevelCache.set(segment, new Map()).get(segment)!;

    // Return cached value if it exists.
    const cached = sCache.get(key);
    if (cached) {
      return cached;
    }

    // Search the layers from highest to lowest priority.
    for (const layer of this._layers) {
      // Check the segmented first and quit if found.
      const lsData = this._getLSData(layer, segment);
      if (lsData.has(key)) {
        const value = { has: true, value: lsData.get(key)! };

        // Save to the cache.
        sCache.set(key, value);

        return value;
      }

      // Check the monolithic and quit if found.
      const lmData = this._getLSData(layer, this.monolithic);
      if (lmData.has(key)) {
        const value = { has: true, value: lmData.get(key)! };

        // Save to the cache.
        sCache.set(key, value);

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
  ): Map<keyof KeyValue, KeyValue[keyof KeyValue]> {
    // Get or create the requested layer.
    let lData = this._data.get(layer);
    if (lData == null) {
      lData = new Map();
      this._data.set(layer, lData);

      this._layers = [...this._data.keys()].sort(reverseNumeric);
    }

    // Get or create the requested segment on the layer.
    let lsData = lData.get(segment);
    if (lsData == null) {
      lsData = new Map();
      lData.set(segment, lsData);

      this._segments.add(segment);
    }

    return lsData;
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

    const lsData = this._getLSData(layer, segment);
    lsData.set(key, value);

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

    const lsData = this._getLSData(layer, segment);
    lsData.delete(key);

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
    for (const lData of this._data.values()) {
      lData.delete(segment);
    }
    this._topLevelCache.delete(segment);
    this._segments.delete(segment);
  }
}
