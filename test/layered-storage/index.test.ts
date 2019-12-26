import { allCombined } from "./all-combined";
import { expanders } from "./expanders";
import { multipleKeys } from "./multiple-keys";
import { multipleLayers } from "./multiple-layers";
import { other } from "./other";
import { segmentedLayer } from "./segmented-layer";
import { singleLayer } from "./single-layer";
import { validation } from "./validation";

describe("Layered storage", function(): void {
  allCombined();
  expanders();
  multipleKeys();
  multipleLayers();
  other();
  segmentedLayer();
  singleLayer();
  validation();
});
