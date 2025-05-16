import { Command } from "commander";
import { z } from "zod";
import chalk from "chalk";
import { an } from "../lib/an";
import * as fs from "fs";
import * as path from "path";
import { Issue, LinearClient } from "@linear/sdk";
import { getApiKey, getIssues } from "../integrations/linear";

export const linearCommand = new Command("linear")
  .description("Interact with Linear issues")
  .addCommand(
    new Command("todos").description("Fetch your assigned Linear todos").action(
      an(z.tuple([z.object({})]), async (options) => {
        try {
          const issues = await getIssues();
          issues.forEach(async (issue) => {
            const project = await issue.project;
            const state = await issue.state;

            const todoItem = {
              id: issue.id,
              identifier: issue.identifier,
              title: issue.title,
              project: project?.name || "No Project",
              state: state?.name || "None",
              due: issue.dueDate,
            };

            console.log(JSON.stringify(todoItem));
          });
        } catch (error) {
          console.error(
            chalk.red(
              `Error fetching Linear issues: ${
                error instanceof Error ? error.message : String(error)
              }`
            )
          );
          process.exit(1);
        }
      })
    )
  );
