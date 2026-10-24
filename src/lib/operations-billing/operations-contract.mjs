/** Approved monthly operations catalogue. Annual prices intentionally absent. */
import approved from "../../../config/approved-pricing.json" with { type: "json" };
export const OPERATION_PRICES = Object.freeze(
  Object.fromEntries(
    Object.entries(approved.operations).map(([tier, offer]) => [
      tier,
      {
        id: offer.monthlyPriceId,
        amount: offer.monthlyCents,
        tools: offer.tools,
        name: offer.name,
      },
    ]),
  ),
);
export const TOOL_KEYS = Object.freeze([
  "crm",
  "inbox",
  "tasks",
  "calendar",
  "inventory",
  "pos",
  "sales",
  "marketing",
  "automation",
  "collaboration",
  "employees",
  "knowledge",
]);
export function operationsPrice(id) {
  return (
    Object.entries(OPERATION_PRICES).find(
      ([, value]) => value.id === id,
    )?.[0] || null
  );
}
export function validTools(tier, tools) {
  return Boolean(
    OPERATION_PRICES[tier] &&
      Array.isArray(tools) &&
      tools.length === OPERATION_PRICES[tier].tools &&
      new Set(tools).size === tools.length &&
      tools.every((tool) => TOOL_KEYS.includes(tool)),
  );
}
export const objectId = (value) =>
  typeof value === "string" ? value : value?.id;
