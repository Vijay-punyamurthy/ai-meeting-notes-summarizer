import { Router, Request, Response } from "express";
import { pgPool } from "../db/postgres";

export const actionItemsRouter = Router();

// PATCH /action-items/:id — edit task/owner/due_date/status
actionItemsRouter.patch("/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  const { task, owner, due_date, status } = req.body as {
    task?: string;
    owner?: string | null;
    due_date?: string | null;
    status?: "open" | "done";
  };

  try {
    const result = await pgPool.query(
      `UPDATE action_items
       SET task = COALESCE($1, task),
           owner = COALESCE($2, owner),
           due_date = COALESCE($3, due_date),
           status = COALESCE($4, status)
       WHERE id = $5
       RETURNING *`,
      [task, owner, due_date, status, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Action item not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update action item" });
  }
});

// DELETE /action-items/:id
actionItemsRouter.delete("/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await pgPool.query(`DELETE FROM action_items WHERE id = $1`, [id]);
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete action item" });
  }
});
