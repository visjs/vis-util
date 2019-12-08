import { KeyValueLookup, LayerRange, Segment } from "./common";

const reverseNumeric = (a: number, b: number): number => b - a;

export class LayeredStorageCore<
  KeyValue extends KeyValueLookup,
  Layer extends LayerRange
> {
  public monolithic = Symbol("Monolithic");

  private _data = new Map<
    Layer,
    Map<Segment, Map<keyof KeyValue, KeyValue[keyof KeyValue]>>
  >();

  private _layers: Layer[] = [];
  private readonly _segments = new Set<Segment>();

  private readonly _topLevelCache = new Map<
    Segment,
    Map<keyof KeyValue, KeyValue[keyof KeyValue]>
  >();

  private _updateCache(key: keyof KeyValue): void {
    segmentsLoop: for (const segment of this._segments) {
      const sCache =
        this._topLevelCache.get(segment) ||
        this._topLevelCache.set(segment, new Map()).get(segment)!;

      sCache.delete(key);

      for (const layer of this._layers) {
        const lsData = this._getLSData(layer, segment);
        if (lsData.has(key)) {
          sCache.set(key, lsData.get(key)!);
          continue segmentsLoop;
        }

        const lmData = this._getLSData(layer, this.monolithic);
        if (lmData.has(key)) {
          sCache.set(key, lmData.get(key)!);
          continue segmentsLoop;
        }
      }
    }
  }

  private _getLSData(
    layer: Layer,
    segment: Segment
  ): Map<keyof KeyValue, KeyValue[keyof KeyValue]> {
    let lData = this._data.get(layer);
    if (lData == null) {
      lData = new Map();
      this._data.set(layer, lData);

      this._layers = [...this._data.keys()].sort(reverseNumeric);
    }

    let lsData = lData.get(segment);
    if (lsData == null) {
      lsData = new Map();
      lData.set(segment, lsData);

      this._segments.add(segment);
    }

    return lsData;
  }

  public get<Key extends keyof KeyValue>(
    segment: Segment,
    key: Key
  ): KeyValue[Key] | undefined {
    const sData = this._topLevelCache.get(segment);
    if (sData == null) {
      return;
    }

    return sData.get(key);
  }

  public has<Key extends keyof KeyValue>(segment: Segment, key: Key): boolean {
    const sData = this._topLevelCache.get(segment);
    if (sData == null) {
      return false;
    }

    return sData.has(key);
  }

  public set<Key extends keyof KeyValue>(
    layer: Layer,
    segment: Segment,
    key: Key,
    value: KeyValue[Key]
  ): void {
    const lsData = this._getLSData(layer, segment);
    lsData.set(key, value);

    this._updateCache(key);
  }

  public delete<Key extends keyof KeyValue>(
    layer: Layer,
    segment: Segment,
    key: Key
  ): boolean {
    const lsData = this._getLSData(layer, segment);
    const didItExist = lsData.delete(key);

    this._updateCache(key);

    return didItExist;
  }

  public deleteSegmentData(segment: Segment): void {
    for (const lData of this._data.values()) {
      lData.delete(segment);
    }
    this._topLevelCache.delete(segment);
    this._segments.delete(segment);
  }
}
