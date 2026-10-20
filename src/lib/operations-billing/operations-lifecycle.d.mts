export type OperationsBinding = {
  subscriptionId: string;
  customerId: string;
  profileId: string;
  workspaceId: string;
  token?: string | null;
  tier: string | null;
  tools: string[] | null;
  anchor: string | null;
  paidUntil: string | null;
  nextTier: string | null;
  nextTools: string[] | null;
};
export type OperationsDecision =
  | { action: "awaiting_payment"; subscriptionId: string }
  | {
      action: "sync";
      workspaceId: string;
      subscriptionId: string;
      tier: string;
      tools: string[];
      anchor: string;
      paidUntil: string;
      status: string;
      evidence: string;
      paidInvoiceId: string | null;
    };
export function evaluateOperationsSubscription(
  subscription: Record<string, unknown>,
  binding: OperationsBinding,
  options?: { now?: number },
): OperationsDecision;
