export type ConduzcoLocale = "en" | "es";
export function conduzcoLocale(
  ...values: Array<string | null | undefined>
): ConduzcoLocale {
  for (const value of values)
    if (value === "en" || value === "es") return value;
  return "es";
}
