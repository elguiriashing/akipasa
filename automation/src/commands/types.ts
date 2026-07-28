import type { Bindings } from "../bindings";
import type { ExecutionRecord } from "../execution-log";
import type { VoiceRequest } from "../schema";

export type CommandContext = {
  env: Bindings;
  request: VoiceRequest;
  execution: ExecutionRecord;
  now: Date;
};

export type CommandResult = {
  summary: string;
  data?: Record<string, unknown>;
};

export type CommandCategory = "finance" | "reports" | "system";
export type CommandEffect = "read" | "external";
export type CommandIcon = "activity" | "expenses" | "report" | "revenue";

export type AutomationCommand = {
  name: string;
  aliases?: string[];
  description: string;
  category: CommandCategory;
  effect: CommandEffect;
  icon: CommandIcon;
  execute(context: CommandContext): Promise<CommandResult>;
};
