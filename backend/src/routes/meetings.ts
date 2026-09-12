import { Router, Request, Response } from "express";
import { pgPool } from "../db/postgres";
import { getTranscriptsCollection, getAgentRunsCollection } from "../db/mongo";
import { summarizeTranscript } from "../services/agent";

export const meetingsRouter = Router();

// POST /meetings — create a meeting and store the raw transcript in Mongo
meetingsRouter.post("/", async (req: Request, res: Response) => {
  const { title, transcript } = req.body as { title?: string; transcript?: string };

  if (!title || !transcript) {
    return res.status(400).json({ error: "title and transcript are required" });
  }

  try {
    const transcripts = await getTranscriptsCollection();
    const transcriptDoc = await transcripts.insertOne({
      rawText: transcript,
      uploadedAt: new Date(),
    });

    const result = await pgPool.query(
      `INSERT INTO meetings (title, transcript_ref, status)
       VALUES ($1, $2, 'pending')
       RETURNING *`,
      [title, transcriptDoc.insertedId.toString()]
    );

    // Backfill meetingId on the transcript doc for traceability
    await transcripts.updateOne(
      { _id: transcriptDoc.insertedId },
      { $set: { meetingId: result.rows[0].id } }
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create meeting" });
  }
});

// GET /meetings — list all meetings
meetingsRouter.get("/", async (_req: Request, res: Response) => {
  try {
    const result = await pgPool.query(
      `SELECT * FROM meetings ORDER BY created_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch meetings" });
  }
});

// GET /meetings/:id — one meeting + its action items
meetingsRouter.get("/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const meetingResult = await pgPool.query(
      `SELECT * FROM meetings WHERE id = $1`,
      [id]
    );
    if (meetingResult.rows.length === 0) {
      return res.status(404).json({ error: "Meeting not found" });
    }

    const actionItemsResult = await pgPool.query(
      `SELECT * FROM action_items WHERE meeting_id = $1 ORDER BY created_at ASC`,
      [id]
    );

    res.json({
      ...meetingResult.rows[0],
      action_items: actionItemsResult.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch meeting" });
  }
});

// POST /meetings/:id/summarize — run the agent, persist structured + raw output
meetingsRouter.post("/:id/summarize", async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const meetingResult = await pgPool.query(
      `SELECT * FROM meetings WHERE id = $1`,
      [id]
    );
    if (meetingResult.rows.length === 0) {
      return res.status(404).json({ error: "Meeting not found" });
    }

    const transcripts = await getTranscriptsCollection();
    const { ObjectId } = await import("mongodb");
    const transcriptDoc = await transcripts.findOne({
      _id: new ObjectId(meetingResult.rows[0].transcript_ref),
    });

    if (!transcriptDoc) {
      return res.status(404).json({ error: "Transcript not found" });
    }

    const runResult = await summarizeTranscript(transcriptDoc.rawText);

    const agentRuns = await getAgentRunsCollection();
    const agentRunDoc = await agentRuns.insertOne({
      meetingId: Number(id),
      rawModelOutput: runResult.rawModelOutput,
      promptUsed: runResult.promptUsed,
      success: runResult.success,
      error: runResult.error || null,
      timestamp: new Date(),
    });

    if (!runResult.success || !runResult.output) {
      await pgPool.query(
        `UPDATE meetings SET status = 'failed', agent_run_ref = $1 WHERE id = $2`,
        [agentRunDoc.insertedId.toString(), id]
      );
      return res.status(502).json({
        error: "Agent failed to produce valid structured output",
        details: runResult.error,
      });
    }

    await pgPool.query(
      `UPDATE meetings
       SET summary = $1, status = 'summarized', agent_run_ref = $2
       WHERE id = $3`,
      [runResult.output.summary, agentRunDoc.insertedId.toString(), id]
    );

    const insertedItems = [];
    for (const item of runResult.output.action_items) {
      const inserted = await pgPool.query(
        `INSERT INTO action_items (meeting_id, task, owner, due_date, status)
         VALUES ($1, $2, $3, $4, 'open')
         RETURNING *`,
        [id, item.task, item.owner, item.due_date]
      );
      insertedItems.push(inserted.rows[0]);
    }

    res.json({
      summary: runResult.output.summary,
      action_items: insertedItems,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to summarize meeting" });
  }
});

// DELETE /meetings/:id
meetingsRouter.delete("/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await pgPool.query(`DELETE FROM meetings WHERE id = $1`, [id]);
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete meeting" });
  }
});
