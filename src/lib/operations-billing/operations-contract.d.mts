export const OPERATION_PRICES: Readonly<
  Record<
    "basico" | "standard" | "pro",
    { id: string; amount: number; tools: number; name: string }
  >
>;
export const TOOL_KEYS: readonly string[];
export function operationsPrice(
  id: unknown,
): "basico" | "standard" | "pro" | null;
export function validTools(tier: string, tools: unknown): boolean;
export function objectId(value: unknown): string | undefined;
