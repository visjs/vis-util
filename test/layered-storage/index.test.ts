import { allCombined } from "./all-combined";
import { cloning } from "./cloning";
import { expanders } from "./expanders";
import { multipleKeys } from "./multiple-keys";
import { multipleLayers } from "./multiple-layers";
import { other } from "./other";
import { segmentedLayer } from "./segmented-layer";
import { singleLayer } from "./single-layer";
import { transactions } from "./transactions";
import { validation } from "./validation";

describe("Layered storage", function (): void {
  allCombined();
  cloning();
  expanders();
  multipleKeys();
  multipleLayers();
  other();
  segmentedLayer();
  singleLayer();
  transactions();
  validation();
});
