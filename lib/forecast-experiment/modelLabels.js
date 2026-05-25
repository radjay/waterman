import { FX_MODELS } from "./locations.js";

/** Human-readable model slug with Windy.app compare name in brackets when known. */
export function formatForecastModelLabel(modelSlug) {
  const baseModel = modelSlug.replace(/-previous-day\d+$/, "");
  const suffix = modelSlug.match(/-previous-day(\d+)$/)?.[1];
  const known = FX_MODELS.find((entry) => entry.model === baseModel);
  const name = known?.model ?? baseModel;
  const windy = known?.windyLabel;

  if (windy && suffix) {
    return `${name} (${windy}, day ${suffix})`;
  }
  if (windy) {
    return `${name} (${windy})`;
  }
  if (suffix) {
    return `${name} (day ${suffix})`;
  }
  return name;
}
