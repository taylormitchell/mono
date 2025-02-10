import type { Request, Response } from "express";
import { z } from "zod";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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

const systemPrompt = `
You are a helpful assistant that helps me track my health and fitness.

You will be given a free-text description of an activity and you will need to return a structured log object 
that represents it.

The following are example outputs. This list is not exhaustive. You should use your best judgement to determine 
the best type of log object to return.

\`\`\`
{
  type: "meditated",
  duration: "10 minutes",
  original: "meditated for 10m"
}
\`\`\`

\`\`\`
{
  type: "food/nutty-puddy",
  original: "ate nutty puddy"
}
\`\`\`

\`\`\`
{
  type: "food/super-veggie",
  original: "ate super veggie"
}
\`\`\`

\`\`\`
{
  type: "exercise",
  name: "Running",
  distance: "5 kilometers",
  original: "ran 5k"
}
\`\`\`
`;

export async function handleAI(req: Request, res: Response) {
  const parsed = aiRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    console.error("Invalid request", { body: req.body, error: parsed.error });
    return res.status(400).json({ error: "Invalid request" });
  }
  const { type, prompt: userPrompt } = parsed.data;
  switch (type) {
    case "create-log": {
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
      });
      try {
        const log = JSON.parse(response.choices[0].message.content ?? "{}");
        console.log(log);
        return res.json(log);
      } catch (e) {
        console.error(e);
        return res.status(500).json({
          error: "Invalid response from AI",
          response: response.choices[0].message.content,
        });
      }
      break;
    }
  }
}
