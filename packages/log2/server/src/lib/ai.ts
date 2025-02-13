import OpenAI from "openai";
import { z } from "zod";
import { logDataSchema } from "../../../shared/types";
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const initialExamples = [
  {
    message: "I ate a big mac",
    response: [
      {
        schema: "consumed",
        action: "ate",
        item: "big mac",
        amount: "1",
      },
    ],
  },
  {
    message: "ate nutty-puddy and drank 1l water",
    response: [
      {
        schema: "consumed",
        action: "ate",
        item: "nutty-puddy",
        amount: "1",
      },
      {
        schema: "consumed",
        action: "drank",
        item: "water",
        amount: "1 liter",
      },
    ],
  },
  {
    message: "easy soft pooped",
    response: [
      {
        schema: "pooped",
        effort: "low",
        poopType: 5,
      },
    ],
  },
  {
    message: "I ran 5k",
    response: [
      {
        schema: "exercise",
        action: "ran",
        distance: "5 kilometers",
      },
    ],
  },
];

const systemPromptTemplate = `
You are a helpful assistant that helps me track my health and fitness.

You will be given a free-text description of an activity and you will need to return a json object 
that represents it.

## Relevant Information 

### Bristol Stool Scale

### Types 
- Type 1: Separate hard lumps, like nuts. Very hard to pass. Dark, pellet-like pieces. Indicates constipation.
- Type 2: Sausage-shaped but lumpy. Hard and compact. Multiple lumps stuck together. Still constipated.
- Type 3: Sausage with surface cracks. Well-formed but firm. Normal stool.
- Type 4: Smooth, soft sausage/snake. Medium to light brown. Ideal stool type.
- Type 5: Soft blobs with clear-cut edges. Easy to pass. Trending loose but still normal.
- Type 6: Fluffy, mushy pieces with ragged edges. Soft with no clear shape. Mild diarrhea.
- Type 7: Entirely liquid, watery with no solid pieces. Classic diarrhea.

### Key Terms
- Hard → Types 1-2
- Well-formed → Types 3-4
- Soft/Loose → Types 5-6
- Liquid → Type 7

## Example Outputs

The following are example outputs. This list is not exhaustive. You should use your best judgement to determine 
the best schema and fields to return.

{{EXAMPLES}}
`;

const responseSchema = z.object({ logs: logDataSchema });

export async function datatify(message: string) {
  const systemPrompt = systemPromptTemplate.replace(
    "{{EXAMPLES}}",
    initialExamples
      .map((e) => {
        return [`Message: ${e.message}`, `Response: ${JSON.stringify({ logs: e.response })}`].join(
          "\n"
        );
      })
      .join("\n")
  );

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: message },
    ],
    response_format: { type: "json_object" },
  });
  console.log(response.choices[0].message.content);
  const result = responseSchema.safeParse(JSON.parse(response.choices[0].message.content ?? "{}"));
  if (!result.success) {
    console.error(result.error);
    return null;
  }
  if ("error" in result.data) {
    console.error("AI returned an error", result.data.error);
    return null;
  }
  return result.data.logs;
}

if (require.main === module) {
  const message = process.argv[2];
  const log = await datatify(message);
  console.log(log);
}
