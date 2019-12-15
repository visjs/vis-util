import { allCombined } from "./all-combined";
import { events } from "./events";
import { multipleKeys } from "./multiple-keys";
import { multipleLayers } from "./multiple-layers";
import { other } from "./other";
import { segmentedLayer } from "./segmented-layer";
import { singleLayer } from "./single-layer";

describe("Layered storage", function(): void {
  allCombined();
  events();
  multipleKeys();
  multipleLayers();
  other();
  segmentedLayer();
  singleLayer();
});
