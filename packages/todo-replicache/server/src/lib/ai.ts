import type { Request, Response } from "express";
import { z } from "zod";

const aiRequestSchema = z.object({
  type: z.enum(["create-log"]),
  prompt: z.string(),
});

const logSchema = z.union([
  z.object({
    type: z.literal("meditated"),
    duration: z.number(),
  }),
  z.object({
    type: z.literal("food"),
    name: z.string(),
    calories: z.number(),
  }),
  z.object({
    type: z.literal("exercise"),
    name: z.string(),
    calories: z.number(),
  }),
]);

const prompt = `
You are a helpful assistant that helps me track my health and fitness.

You will be given a prompt and you will need to return a log object that matches the schema.

Example log objects:
\`\`\`
{
  type: "meditated",
  startedAt: "2024-01-01T00:00:00Z",
  endedAt: "2024-01-01T00:10:00Z",
  original: "meditated for 10m"
}
\`\`\`

\`\`\`
{
  type: "food/nutty-puddy",
}
\`\`\`

\`\`\`
{
  type: "food/super-veggie",
}
\`\`\`

\`\`\`
{
  type: "exercise",
  name: "Running",
  calories: 100,
}
\`\`\`
`;

export async function handleAI(req: Request, res: Response) {
  const parsed = aiRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    console.error(parsed.error);
    return res.status(400).json({ error: "Invalid request" });
  }
  const { type, prompt } = parsed.data;
  switch (type) {
    case "create-log": {
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
      });
      break;
    }
  }
}
