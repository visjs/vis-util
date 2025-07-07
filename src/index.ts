// New API (tree shakeable).
export * from "./entry-esnext.ts";

// Old API (treeshakeable only if completely unused).
import * as util from "./util.ts";
export default util;
