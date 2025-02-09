import type { Request, Response } from "express";

export async function handleAI(req: Request, res: Response) {
  const { prompt } = req.body;
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
  });
}
