export type KeyRange = number | string | symbol;
export type LayerRange = number;
export type Segment = boolean | number | object | string | symbol;

export type KeyValueLookup = {
  [Key in KeyRange]: any;
};

export type KeyValueEntry<
  KV extends KeyValueLookup,
  Key extends keyof KV = keyof KV
> = {
  [Key in keyof KV]: readonly [Key, KV[Key]];
}[Key];
