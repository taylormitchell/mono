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

const poopScale = `
Bristol Stool Scale
- Type 1: Separate hard lumps, like nuts. Very hard to pass. Dark, pellet-like pieces. Indicates constipation.
- Type 2: Sausage-shaped but lumpy. Hard and compact. Multiple lumps stuck together. Still constipated.
- Type 3: Sausage with surface cracks. Well-formed but firm. Normal stool.
- Type 4: Smooth, soft sausage/snake. Medium to light brown. Ideal stool type.
- Type 5: Soft blobs with clear-cut edges. Easy to pass. Trending loose but still normal.
- Type 6: Fluffy, mushy pieces with ragged edges. Soft with no clear shape. Mild diarrhea.
- Type 7: Entirely liquid, watery with no solid pieces. Classic diarrhea.

Key Terms
- Hard → Types 1-2
- Well-formed → Types 3-4
- Soft/Loose → Types 5-6
- Liquid → Type 7

`;

const initialExamples = [
  {
    text: "I ate a big mac",
    data: {
      type: "ate",
      name: "big mac",
      amount: "1",
    },
  },
  {
    text: "I drank 1 liter of water",
    data: {
      type: "drank",
      name: "water",
      amount: "1 liter",
    },
  },
  {
    text: "I pooped",
    data: {
      type: "pooped",
      poopType: 2,
    },
  },
];

const systemPromptTemplate = `
You are a helpful assistant that helps me track my health and fitness.

You will be given a free-text description of an activity and you will need to return a json object 
that represents it.

The following are example outputs. This list is not exhaustive. You should use your best judgement to determine 
the best type of log object to return.

\`\`\`
{
  type: "log/meditated",
  duration: "10m",
  original: "meditated for 10m"
}
\`\`\`

\`\`\`
{
  type: "log/food/nutty-puddy",
  original: "ate nutty puddy"
}
\`\`\`

\`\`\`
{
  type: "log/pooped",
  effort: "low",
  poopType: 2,
  original: "easy poop"
}
\`\`\`

\`\`\`
{
  type: "log/food/water",
  amount: "1 liter",
  original: "drank water"
}
\`\`\`

\`\`\`
{
  type: "log/exercise/running",
  distance: "5 kilometers",
  original: "ran 5k"
}
\`\`\`
`;

const userPromptTemplate = `
Description of the activity:
<description>

Entry timestamp:
<timestamp>
`;

export async function handleAI(req: Request, res: Response) {
  const parsed = aiRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    console.error("Invalid request", { body: req.body, error: parsed.error });
    return res.status(400).json({ error: "Invalid request" });
  }
  const systemPrompt = systemPromptTemplate;
  const { type, prompt: userDescription } = parsed.data;
  const userPrompt = userPromptTemplate
    .replace("<timestamp>", new Date().toISOString())
    .replace("<description>", userDescription);

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
