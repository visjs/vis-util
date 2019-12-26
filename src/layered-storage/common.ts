export type KeyRange = number | string | symbol;
export type KeyValueLookup = Record<KeyRange, any>;
export type LayerRange = number;
export type Segment = boolean | number | object | string | symbol;
export type KeyValuePair<KV extends KeyValueLookup> = {
  [Key in keyof KV]: readonly [Key, KV[Key]];
}[keyof KV];
export type FilteredKeyValuePair<
  KV extends KeyValueLookup,
  Keys extends keyof KV
> = {
  [Key in Keys]: readonly [Key, KV[Key]];
}[Keys];
