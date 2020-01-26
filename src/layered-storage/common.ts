export type KeyRange = number | string | symbol;
export type LayerRange = number;
export type Segment = boolean | number | object | string | symbol;

export type KeyValueLookup<Keys extends KeyRange> = Record<
  Keys,
  boolean | number | object | string | symbol
>;

export type KeyValueEntry<
  KV extends object,
  Key extends keyof KV = keyof KV
> = {
  [Key in keyof KV]: readonly [Key, KV[Key]];
}[Key];
