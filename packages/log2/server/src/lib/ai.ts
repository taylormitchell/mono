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
You are a specialized health and fitness tracking assistant. Your task is to parse free-text descriptions of health activities and convert them into structured data.

## INSTRUCTIONS
1. Analyze the user's input carefully to identify health-related activities
2. Extract relevant details like time, quantity, duration, intensity, etc.
3. Map the activity to the most appropriate schema from the examples
4. Return a properly formatted JSON object with all extracted information
5. Use consistent units when possible (e.g., minutes for time, kilometers for distance)
6. Infer reasonable values for missing information based on context
7. If multiple activities are mentioned, create separate entries for each
8. For timestamps:
   - Use the provided eventSubmittedAt timestamp as the default startedAt time if no specific time is mentioned
   - Do NOT modify the timezone offset in the timestamp
   - If a specific time is mentioned (like "at noon" or "at 3pm"), adjust only the hours/minutes while keeping the same date and timezone (unless says something like "yesterday" or "2 days ago")

## User provided context

{{USER_PROMPT}}

## Example Outputs

The following examples demonstrate the expected format. This list is not exhaustive - use your judgment to determine the appropriate schema and fields for any given input.

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
