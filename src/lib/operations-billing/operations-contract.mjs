/** Approved monthly operations catalogue. Annual prices intentionally absent. */
export const OPERATION_PRICES = Object.freeze({
  basico: { id: "price_1USgZRGfzDhsgsQZaZYnAjZC", amount: 2499, tools: 4 },
  standard: { id: "price_1USgZhGfzDhsgsQZBLuFFQ3c", amount: 4499, tools: 8 },
  pro: { id: "price_1USgZiGfzDhsgsQZYEgPv3HL", amount: 6499, tools: 12 },
});
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
