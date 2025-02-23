import OpenAI from "openai";
import { z } from "zod";
import { logDataSchema, type LogData } from "../../../shared/types";
import { getDb } from "./db/helpers";
import { desc, isNull } from "drizzle-orm";
import { logTable } from "./db/schema";

async function getRecentLogs(): Promise<
  { eventDescription: string; eventSubmittedAt: string; response: any[] }[]
> {
  const db = await getDb();
  const logs = await db
    .select()
    .from(logTable)
    .where(isNull(logTable.deletedAt))
    .orderBy(desc(logTable.createdAt))
    .limit(10);

  return logs.map((log) => ({
    eventDescription: log.text,
    eventSubmittedAt: log.createdAt,
    response: log.data || [],
  }));
}

const openai = new OpenAI({
  apiKey: process.env["OPENAI_API_KEY"],
});

const initialExamples: { eventDescription: string; eventSubmittedAt: string; response: any[] }[] = [
  {
    eventSubmittedAt: "2025-02-12T23:04:31-05:00",
    eventDescription: "I ate a big mac",
    response: [
      {
        schema: "consumed",
        action: "ate",
        item: "big mac",
        amount: "1",
        startedAt: "2025-02-12T23:04:31-05:00",
      },
    ],
  },
  {
    eventSubmittedAt: "2025-02-14T01:32:28-05:00",
    eventDescription: "ate nutty-puddy and drank 1l water at noon",
    response: [
      {
        schema: "consumed",
        action: "ate",
        item: "nutty-puddy",
        amount: "1",
        startedAt: "2025-02-13T17:00:00-05:00",
      },
      {
        schema: "consumed",
        action: "drank",
        item: "water",
        amount: "1 liter",
        startedAt: "2025-02-13T17:00:00-05:00",
      },
    ],
  },
  {
    eventSubmittedAt: "2025-01-09T12:57:00-05:00",
    eventDescription: "easy soft pooped",
    response: [
      {
        schema: "pooped",
        effort: "low",
        poopType: 5,
        startedAt: "2025-01-09T12:57:00-05:00",
      },
    ],
  },
  {
    eventSubmittedAt: "2025-01-07T17:19:20-05:00",
    eventDescription: "I ran 5k in 30 minutes",
    response: [
      {
        schema: "exercise",
        action: "ran",
        distance: "5 kilometers",
        startedAt: "2025-01-07T17:19:20-05:00",
        duration: "30 minutes",
      },
    ],
  },
];

const systemPromptTemplate = `
You are a helpful assistant that helps me track my health and fitness.

You will be given a free-text description of an activity and you will need to return a json object 
that represents it.

## User provided context

{{USER_PROMPT}}

## Example Outputs

The following are example outputs. This list is not exhaustive. You should use your best judgement to determine 
the best schema and fields to return.

{{EXAMPLES}}
`;

const responseSchema = z.object({ logs: logDataSchema });

export async function datatify({
  message,
  userPrompt,
  timestamp,
}: {
  message: string;
  userPrompt: string;
  timestamp: string;
}): Promise<LogData | null> {
  const recentLogs = await getRecentLogs();
  const examples = [...initialExamples, ...recentLogs].slice(0, 20);

  const systemPrompt = systemPromptTemplate.replace("{{USER_PROMPT}}", userPrompt).replace(
    "{{EXAMPLES}}",
    examples
      .map((e) => {
        return [
          `Message: ${JSON.stringify({
            eventSubmittedAt: e.eventSubmittedAt,
            eventDescription: e.eventDescription,
          })}`,
          `Response: ${JSON.stringify({ logs: e.response })}`,
        ].join("\n");
      })
      .join("\n")
  );
  console.log("systemPrompt", systemPrompt);

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: JSON.stringify({ eventSubmittedAt: timestamp, eventDescription: message }),
      },
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
