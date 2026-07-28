import { generatedCommands } from "./commands/generated";
import type {
  AutomationCommand,
  CommandCategory,
  CommandEffect,
  CommandIcon,
} from "./commands/types";
import { AppError } from "./errors";

function normalize(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

const commands = new Map<string, AutomationCommand>();
for (const command of generatedCommands) {
  for (const name of [command.name, ...(command.aliases || [])]) {
    const key = normalize(name);
    if (commands.has(key)) {
      throw new Error(`Duplicate automation command alias: ${key}`);
    }
    commands.set(key, command);
  }
}

export function resolveCommand(name: string) {
  const command = commands.get(normalize(name));
  if (!command) {
    throw new AppError(
      "unknown-command",
      404,
      "The requested automation command is not registered.",
      true,
    );
  }
  return command;
}

export type CommandDescriptor = {
  name: string;
  aliases: string[];
  description: string;
  category: CommandCategory;
  effect: CommandEffect;
  icon: CommandIcon;
};

export function describeCommand(command: AutomationCommand): CommandDescriptor {
  return {
    name: command.name,
    aliases: command.aliases || [],
    description: command.description,
    category: command.category,
    effect: command.effect,
    icon: command.icon,
  };
}

export function listCommands(): CommandDescriptor[] {
  return generatedCommands.map(describeCommand);
}
