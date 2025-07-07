import { Activator as ActivatorJS } from "./activator.js";
import { ColorPicker as ColorPickerJS } from "./color-picker.js";
import { Configurator as ConfiguratorJS } from "./configurator.js";
import { Hammer as HammerJS } from "./hammer.js";
import { Popup as PopupJS } from "./popup.js";
import { VALIDATOR_PRINT_STYLE as VALIDATOR_PRINT_STYLE_JS } from "./validator.js";
import { Validator as ValidatorJS } from "./validator.js";

export const Activator: any = ActivatorJS;
export const ColorPicker: any = ColorPickerJS;
export const Configurator: any = ConfiguratorJS;
export const Hammer: HammerStatic = HammerJS;
export const Popup: any = PopupJS;
export const VALIDATOR_PRINT_STYLE: string = VALIDATOR_PRINT_STYLE_JS;
export const Validator: any = ValidatorJS;

export * from "./configurator-types.ts";
