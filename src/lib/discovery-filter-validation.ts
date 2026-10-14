import type { Locale } from "./config";

type RangeValues = {
  minPrice?: string;
  maxPrice?: string;
  dateFrom?: string;
  dateTo?: string;
};

export function discoveryRangeError(values: RangeValues, locale: Locale) {
  const min = values.minPrice ? Number(values.minPrice) : undefined;
  const max = values.maxPrice ? Number(values.maxPrice) : undefined;
  if (
    min !== undefined &&
    max !== undefined &&
    Number.isFinite(min) &&
    Number.isFinite(max) &&
    min > max
  ) {
    return locale === "es"
      ? "El precio mínimo no puede superar el máximo."
      : "Minimum price cannot be greater than maximum price.";
  }
  if (
    values.dateFrom &&
    values.dateTo &&
    /^\d{4}-\d{2}-\d{2}$/.test(values.dateFrom) &&
    /^\d{4}-\d{2}-\d{2}$/.test(values.dateTo) &&
    values.dateFrom > values.dateTo
  ) {
    return locale === "es"
      ? "La fecha inicial no puede ser posterior a la final."
      : "Start date cannot be after end date.";
  }
  return null;
}
