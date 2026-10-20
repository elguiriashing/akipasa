export function buildRenewalSchedulePreview(
  subscription: Record<string, unknown>,
  schedule: Record<string, unknown>,
  row: Record<string, unknown>,
): {
  parameters: Record<string, unknown>;
  scheduleId: string;
  subscriptionId: string;
  previewOnly: boolean;
};
export function buildMigrationManifest(input: unknown): Record<string, unknown>;
