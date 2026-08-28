import { Request, Response } from "express";
import { query } from "../config/db";

export async function listEvents(_req: Request, res: Response): Promise<void> {
  try {
    const eventsResult = await query(
      `SELECT e.*, COALESCE(e.registered_count, 0) AS registered_count
       FROM events e ORDER BY e.event_date ASC`,
    );

    const regsResult = await query(
      "SELECT event_id, user_id, student_name FROM registrations",
    );

    const userId = _req.user?.userId ?? null;

    const events = eventsResult.rows.map((e: Record<string, unknown>) => {
      const regs = regsResult.rows.filter(
        (r: Record<string, unknown>) => r.event_id === e.id,
      );
      return {
        _id: e.id,
        title: e.title,
        description: e.description ?? "",
        date: e.event_date,
        location: e.location,
        capacity: e.capacity,
        registeredCount: e.registered_count,
        registeredStudents: regs.map((r: Record<string, unknown>) => r.student_name),
        isRegistered: regs.some((r: Record<string, unknown>) => r.user_id === userId),
        createdBy: e.created_by,
      };
    });

    res.json(events);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to list events";
    res.status(500).json({ error: msg });
  }
}

export async function getEvent(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const result = await query("SELECT * FROM events WHERE id = $1", [id]);
    if (!result.rowCount) {
      res.status(404).json({ error: "Event not found" });
      return;
    }
    const e = result.rows[0];

    const regs = await query(
      "SELECT user_id, student_name FROM registrations WHERE event_id = $1 ORDER BY created_at",
      [id],
    );

    const attendance = await query(
      "SELECT * FROM attendance WHERE event_id = $1 ORDER BY marked_at DESC",
      [id],
    );

    res.json({
      _id: e.id,
      title: e.title,
      description: e.description ?? "",
      date: e.event_date,
      location: e.location,
      capacity: e.capacity,
      registeredCount: e.registered_count ?? 0,
      registeredStudents: regs.rows.map((r: any) => r.student_name),
      createdBy: e.created_by,
      registrations: regs.rows.map((r: any) => ({
        userId: r.user_id,
        studentName: r.student_name,
      })),
      attendance: attendance.rows.map((a: any) => ({
        _id: a.id,
        eventId: a.event_id,
        studentName: a.student_name,
        status: a.status,
        markedAt: a.marked_at,
      })),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to get event";
    res.status(500).json({ error: msg });
  }
}

export async function createEvent(req: Request, res: Response): Promise<void> {
  try {
    const { title, description, date, location, capacity } = req.body;
    const createdBy = req.user!.userId;

    const result = await query(
      `INSERT INTO events (title, description, event_date, location, capacity, created_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [title, description ?? "", new Date(date).toISOString(), location, capacity, createdBy],
    );

    const e = result.rows[0];
    res.status(201).json({
      _id: e.id,
      title: e.title,
      description: e.description ?? "",
      date: e.event_date,
      location: e.location,
      capacity: e.capacity,
      registeredCount: 0,
      registeredStudents: [],
      isRegistered: false,
      createdBy: e.created_by,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to create event";
    res.status(500).json({ error: msg });
  }
}

export async function updateEvent(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;
    const role = req.user!.role;

    // Ownership check (replaces RLS is_event_owner)
    const existing = await query("SELECT created_by FROM events WHERE id = $1", [id]);
    if (!existing.rowCount) {
      res.status(404).json({ error: "Event not found" });
      return;
    }
    if (existing.rows[0].created_by !== userId && role !== "admin") {
      res.status(403).json({ error: "Not authorized to edit this event" });
      return;
    }

    const fields: string[] = [];
    const values: unknown[] = [];
    let i = 1;

    for (const [key, val] of Object.entries(req.body)) {
      if (val === undefined) continue;
      if (key === "date") {
        fields.push(`event_date = $${i}`);
        values.push(new Date(val as string).toISOString());
      } else {
        fields.push(`${key} = $${i}`);
        values.push(val);
      }
      i++;
    }

    if (fields.length === 0) {
      res.status(400).json({ error: "No fields to update" });
      return;
    }

    values.push(id);
    const result = await query(
      `UPDATE events SET ${fields.join(", ")} WHERE id = $${i} RETURNING *`,
      values,
    );

    const e = result.rows[0];
    res.json({
      _id: e.id,
      title: e.title,
      description: e.description ?? "",
      date: e.event_date,
      location: e.location,
      capacity: e.capacity,
      registeredCount: e.registered_count ?? 0,
      createdBy: e.created_by,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to update event";
    res.status(500).json({ error: msg });
  }
}

export async function deleteEvent(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;
    const role = req.user!.role;

    const existing = await query("SELECT created_by FROM events WHERE id = $1", [id]);
    if (!existing.rowCount) {
      res.status(404).json({ error: "Event not found" });
      return;
    }
    if (existing.rows[0].created_by !== userId && role !== "admin") {
      res.status(403).json({ error: "Not authorized to delete this event" });
      return;
    }

    await query("DELETE FROM events WHERE id = $1", [id]);
    res.json({ success: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to delete event";
    res.status(500).json({ error: msg });
  }
}

export async function registerStudent(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { studentName } = req.body;
    const userId = req.user!.userId;

    try {
      await query(
        "INSERT INTO registrations (event_id, user_id, student_name) VALUES ($1, $2, $3)",
        [id, userId, studentName],
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("Event is full")) {
        res.status(400).json({ error: "This event is full" });
        return;
      }
      if (msg.includes("duplicate") || msg.includes("23505")) {
        res.status(409).json({ error: "You are already registered for this event" });
        return;
      }
      throw err;
    }

    res.status(201).json({ success: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to register";
    res.status(500).json({ error: msg });
  }
}

export async function cancelRegistration(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;

    await query(
      "DELETE FROM registrations WHERE event_id = $1 AND user_id = $2",
      [id, userId],
    );
    res.json({ success: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to cancel";
    res.status(500).json({ error: msg });
  }
}

export async function getAttendance(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const result = await query(
      "SELECT * FROM attendance WHERE event_id = $1 ORDER BY marked_at DESC",
      [id],
    );
    res.json(
      result.rows.map((a: any) => ({
        _id: a.id,
        eventId: a.event_id,
        studentName: a.student_name,
        status: a.status === "Absent" ? "Absent" : "Present",
        markedAt: a.marked_at,
      })),
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to get attendance";
    res.status(500).json({ error: msg });
  }
}

export async function markAttendance(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { studentName, status, userId } = req.body;
    const markedBy = req.user!.userId;

    const existing = await query(
      "SELECT id FROM attendance WHERE event_id = $1 AND student_name = $2",
      [id, studentName],
    );

    if (existing.rowCount && existing.rowCount > 0) {
      await query(
        "UPDATE attendance SET status = $1, marked_at = $2 WHERE id = $3",
        [status, new Date().toISOString(), existing.rows[0].id],
      );
    } else {
      await query(
        `INSERT INTO attendance (event_id, student_name, status, user_id, marked_by)
         VALUES ($1, $2, $3, $4, $5)`,
        [id, studentName, status, userId ?? null, markedBy],
      );
    }

    res.json({ success: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to mark attendance";
    res.status(500).json({ error: msg });
  }
}
