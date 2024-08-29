import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Schema for a single definition
const DefinitionSchema = z.object({
  word: z.string(),
  definition: z.string(),
  examples: z.array(z.string()),
});

// Schema for the full response
const DefinitionsResponseSchema = z.object({
  definitions: z.array(DefinitionSchema),
});

// Type inference from the schemas
export type Definition = z.infer<typeof DefinitionSchema>;
type DefinitionsResponse = z.infer<typeof DefinitionsResponseSchema>;

export async function getDefinitions(words: string[]): Promise<DefinitionsResponse> {
  const prompt = `Provide a concise definition for the following words and 1-2 examples of usage (with word in double curly braces, e.g. "{{word}} is..."):
${words.join(", ")}`;
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini-2024-07-18",
    response_format: zodResponseFormat(DefinitionsResponseSchema, "definitions"),
    messages: [
      { role: "system", content: "You are a helpful assistant that provides word definitions." },
      { role: "user", content: prompt },
    ],
  });
  return DefinitionsResponseSchema.parse(JSON.parse(response.choices[0].message.content || "{}"));
}
