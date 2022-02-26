/**
 * Seedable, fast and reasonably good (not crypto but more than okay for our
 * needs) random number generator.
 *
 * @remarks
 * Adapted from {@link https://web.archive.org/web/20110429100736/http://baagoe.com:80/en/RandomMusings/javascript}.
 * Original algorithm created by Johannes Baagøe \<baagoe\@baagoe.com\> in 2010.
 */

/**
 * Random number generator.
 */
export interface RNG {
  /** Returns \<0, 1). Faster than [[fract53]]. */
  (): number;
  /** Returns \<0, 1). Provides more precise data. */
  fract53(): number;
  /** Returns \<0, 2^32). */
  uint32(): number;

  /** The algorithm gehind this instance. */
  algorithm: string;
  /** The seed used to seed this instance. */
  seed: Mashable[];
  /** The version of this instance. */
  version: string;
}

/**
 * Create a seeded pseudo random generator based on Alea by Johannes Baagøe.
 *
 * @param seed - All supplied arguments will be used as a seed. In case nothing
 * is supplied the current time will be used to seed the generator.
 * @returns A ready to use seeded generator.
 */
export function Alea(...seed: Mashable[]): RNG {
  return AleaImplementation(seed.length ? seed : [Date.now()]);
}

/**
 * An implementation of [[Alea]] without user input validation.
 *
 * @param seed - The data that will be used to seed the generator.
 * @returns A ready to use seeded generator.
 */
function AleaImplementation(seed: Mashable[]): RNG {
  let [s0, s1, s2] = mashSeed(seed);
  let c = 1;

  const random: RNG = (): number => {
    const t = 2091639 * s0 + c * 2.3283064365386963e-10; // 2^-32
    s0 = s1;
    s1 = s2;
    return (s2 = t - (c = t | 0));
  };

  random.uint32 = (): number => random() * 0x100000000; // 2^32

  random.fract53 = (): number =>
    random() + ((random() * 0x200000) | 0) * 1.1102230246251565e-16; // 2^-53

  random.algorithm = "Alea";
  random.seed = seed;
  random.version = "0.9";

  return random;
}

/**
 * Turn arbitrary data into values [[AleaImplementation]] can use to generate
 * random numbers.
 *
 * @param seed - Arbitrary data that will be used as the seed.
 * @returns Three numbers to use as initial values for [[AleaImplementation]].
 */
function mashSeed(...seed: Mashable[]): [number, number, number] {
  const mash = Mash();

  let s0 = mash(" ");
  let s1 = mash(" ");
  let s2 = mash(" ");

  for (let i = 0; i < seed.length; i++) {
    s0 -= mash(seed[i]);
    if (s0 < 0) {
      s0 += 1;
    }
    s1 -= mash(seed[i]);
    if (s1 < 0) {
      s1 += 1;
    }
    s2 -= mash(seed[i]);
    if (s2 < 0) {
      s2 += 1;
    }
  }

  return [s0, s1, s2];
}

/**
 * Values of these types can be used as a seed.
 */
export type Mashable = number | string | boolean | object | bigint;

/**
 * Create a new mash function.
 *
 * @returns A nonpure function that takes arbitrary [[Mashable]] data and turns
 * them into numbers.
 */
function Mash(): (data: Mashable) => number {
  let n = 0xefc8249d;

  return function (data): number {
    const string = data.toString();
    for (let i = 0; i < string.length; i++) {
      n += string.charCodeAt(i);
      let h = 0.02519603282416938 * n;
      n = h >>> 0;
      h -= n;
      h *= n;
      n = h >>> 0;
      h -= n;
      n += h * 0x100000000; // 2^32
    }
    return (n >>> 0) * 2.3283064365386963e-10; // 2^-32
  };
}
