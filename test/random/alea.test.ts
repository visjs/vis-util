import snapshot from "snap-shot-it";

import { Alea, type RNG } from "../../src/random/index.ts";

describe("Alea", function (): void {
  this.timeout(60000);

  const count = 100;

  for (const { name, get } of [
    { name: "rng()", get: (rng: RNG): number => rng() },
    { name: "rng.fract53()", get: (rng: RNG): number => rng.fract53() },
    { name: "rng.uint32()", get: (rng: RNG): number => rng.uint32() },
  ]) {
    describe(name, function (): void {
      for (const seed of [
        [
          "I'm an alligator",
          " I'm a mama-papa coming for you",
          " I'm the space invader",
          " I'll be a rock 'n' rollin' bitch for you.",
        ],
        +new Date("2020-01-01"),
        false,
        true,
        Math.PI,
        BigInt("4235467986087964853726437"),
        -0.00432,
        -423,
        0.1244942,
        77,
        0,
        "We can be zeros, just for one day",
      ]) {
        it(`Seed: ${seed.toString()}`, function (): void {
          const alea = Alea(seed);

          const values = Array(count);
          for (let i = 0; i < count; ++i) {
            values[i] = get(alea);
          }

          // Note: All the code above could be replaced by two args for data
          // driven snapshots however the overhead of that is insane. The tests
          // would go from milliseconds to seconds.
          snapshot(values);
        });
      }
    });
  }
});
