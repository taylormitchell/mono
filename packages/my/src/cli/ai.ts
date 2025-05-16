import { Command } from "commander";
import { askCommand } from "./ask";
import { cmdCommand } from "./cmd";
import { mcpCommand } from "./mcp";

export const aiCommand = new Command("ai")
  .description("AI assistant commands")
  .addCommand(askCommand)
  .addCommand(cmdCommand)
  .addCommand(mcpCommand);
