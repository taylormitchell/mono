import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import * as linear from "../integrations/linear";
import { LinearClient } from "@linear/sdk";
import fetch from "node-fetch";

// Create the MCP server
const server = new McpServer({
  name: "My CLI",
  version: "1.0.0",
  description: "MCP server for My CLI providing access to services and APIs",
});

server.tool(
  "query-linear-graphql",
  {
    query: z.string().min(1, "GraphQL query is required"),
    variables: z.record(z.any()).optional(),
  },
  async ({ query, variables }) => {
    // Validate API key
    const apiKey = linear.getApiKey();
    if (!apiKey) {
      return {
        content: [
          {
            type: "text",
            text: "Error: Linear API key not found. Please configure your Linear API key first.",
          },
        ],
      };
    }

    // Basic validation for GraphQL query syntax
    if (!query.trim().startsWith("query") && !query.trim().startsWith("mutation")) {
      return {
        content: [
          {
            type: "text",
            text: "Error: Invalid GraphQL query. Query should start with 'query' or 'mutation'.",
          },
        ],
      };
    }

    try {
      const response = await fetch("https://api.linear.app/graphql", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: apiKey,
        },
        body: JSON.stringify({
          query,
          variables: variables || {},
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        return {
          content: [
            {
              type: "text",
              text: `HTTP error ${response.status}: ${errorText}`,
            },
          ],
        };
      }

      const result = await response.json();

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error executing GraphQL query: ${
              error instanceof Error ? error.message : "Unknown error"
            }`,
          },
        ],
      };
    }
  }
);

export default server;
