import { Command } from "commander";
import { z } from "zod";
import chalk from "chalk";
import { an } from "../lib/an";
import server from "../lib/mcp";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

export const mcpCommand = new Command("mcp").description("Model Context Protocol server").action(
  an(z.tuple([z.object({})]), async () => {
    try {
      const transport = new StdioServerTransport();
      await server.connect(transport);
    } catch (error) {
      console.error(
        chalk.red(
          `Error starting MCP server: ${error instanceof Error ? error.message : String(error)}`
        )
      );
      process.exit(1);
    }
  })
);
