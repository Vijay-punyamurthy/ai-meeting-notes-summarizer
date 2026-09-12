import OpenAI from "openai";
import { z } from "zod";
import dotenv from "dotenv";
import { AgentSummaryOutput } from "../types";

dotenv.config();

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL || undefined,
});
const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

// Runtime validation of the LLM's JSON output. If this fails, we treat the
// run as failed rather than trusting free-form model output blindly —
// this is the "handling malformed LLM output" story worth telling in interviews.
const agentOutputSchema = z.object({
  summary: z.string().min(1),
  action_items: z.array(
    z.object({
      task: z.string().min(1),
      owner: z.string().nullable(),
      due_date: z.string().nullable(),
    })
  ),
});

const SYSTEM_PROMPT = `You are a meeting notes assistant. Given a raw meeting transcript,
extract a concise summary and a list of action items.

Respond with ONLY valid JSON, no markdown fences, no preamble, matching exactly this shape:
{
  "summary": "string",
  "action_items": [
    { "task": "string", "owner": "string or null", "due_date": "YYYY-MM-DD or null" }
  ]
}

If no owner or due date is mentioned for a task, use null. If there are no clear
action items, return an empty array for action_items.`;

export interface AgentRunResult {
  success: boolean;
  output: AgentSummaryOutput | null;
  rawModelOutput: string;
  promptUsed: string;
  error?: string;
}

export async function summarizeTranscript(
  transcript: string
): Promise<AgentRunResult> {
  const userPrompt = `Meeting transcript:\n\n${transcript}`;

  let rawText = "";
  try {
    const response = await client.chat.completions.create({
      model: MODEL,
      temperature: 0.2,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
    });

    rawText = response.choices[0]?.message?.content?.trim() || "";

    // Defensive parse: strip accidental markdown fences before JSON.parse
    const cleaned = rawText.replace(/^```json\s*|```$/g, "").trim();
    const parsedJson = JSON.parse(cleaned);
    const validated = agentOutputSchema.parse(parsedJson);

    return {
      success: true,
      output: validated,
      rawModelOutput: rawText,
      promptUsed: userPrompt,
    };
  } catch (err) {
    return {
      success: false,
      output: null,
      rawModelOutput: rawText,
      promptUsed: userPrompt,
      error: err instanceof Error ? err.message : "Unknown agent error",
    };
  }
}
