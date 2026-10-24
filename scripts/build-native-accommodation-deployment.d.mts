export interface NativeSourceStatement {
  migration: string;
  statement: number;
  sha256: string;
}
export interface NativeDeploymentPhase {
  id: string;
  file: string;
  migration_name: string;
  depends_on: string[];
  bytes: number;
  sha256: string;
  oversize_reason: string | null;
  source_statements: NativeSourceStatement[];
}
export interface NativeDeploymentManifest {
  version: number;
  function_names: string[];
  table_names: string[];
  source_commit: string;
  purpose: string;
  sources: Array<{ path: string; sha256: string }>;
  lock_timeout_ms: number;
  statement_timeout_ms: number;
  idle_transaction_timeout_ms: number;
  phases: NativeDeploymentPhase[];
}
export const deploymentDirectory: string;
export const sourceMigrations: string[];
export function digest(value: string): string;
export function splitSql(source: string): string[];
export function buildDeployment(): Promise<{
  files: Record<string, string>;
  manifest: NativeDeploymentManifest;
}>;
