// New API (tree shakeable).
export * from "./random";
export * from "./util";

// Old API (treeshakeable only if completely unused).
import * as util from "./util";
export default util;
