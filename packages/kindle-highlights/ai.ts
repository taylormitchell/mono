import OpenAI from "openai";
import { z } from "zod";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Schema for a single definition
const DefinitionSchema = z.object({
  word: z.string(),
  definition: z.string(),
});

// Schema for the full response
const DefinitionsResponseSchema = z.object({
  definitions: z.array(DefinitionSchema),
});

// Type inference from the schemas
export type Definition = z.infer<typeof DefinitionSchema>;
type DefinitionsResponse = z.infer<typeof DefinitionsResponseSchema>;

export async function fetchDefinitions(words: string[]): Promise<Record<string, string>> {
  const prompt = `Provide a concise definition for the following words. Return the result as a JSON object where the keys are the words and the values are their definitions:
${words.join(", ")}`;
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini-2024-07-18",
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "definitions",
        schema: {
          type: "object",
          properties: {
            definitions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  word: {
                    type: "string",
                  },
                  definition: {
                    type: "string",
                  },
                },
                required: ["word", "definition"],
              },
            },
          },
          required: ["definitions"],
        },
      },
    },
    messages: [
      { role: "system", content: "You are a helpful assistant that provides word definitions." },
      { role: "user", content: prompt },
    ],
  });

  const definitions = JSON.parse(response.choices[0].message.content || "{}");
  return definitions;
}
