import { Request, Response } from "express";
import { query } from "../config/db";

export async function listNotifications(req: Request, res: Response): Promise<void> {
  try {
    const result = await query(
      "SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 30",
      [req.user!.userId],
    );
    res.json(
      result.rows.map((n: any) => ({
        _id: n.id,
        title: n.title,
        message: n.message,
        read: n.read,
        createdAt: n.created_at,
      })),
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to list notifications";
    res.status(500).json({ error: msg });
  }
}

export async function markRead(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    await query(
      "UPDATE notifications SET read = true WHERE id = $1 AND user_id = $2",
      [id, req.user!.userId],
    );
    res.json({ success: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to mark read";
    res.status(500).json({ error: msg });
  }
}

export async function markAllRead(req: Request, res: Response): Promise<void> {
  try {
    await query(
      "UPDATE notifications SET read = true WHERE user_id = $1 AND read = false",
      [req.user!.userId],
    );
    res.json({ success: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to mark all read";
    res.status(500).json({ error: msg });
  }
}
