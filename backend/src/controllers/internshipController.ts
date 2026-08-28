import { Request, Response } from "express";
import { query } from "../config/db";

export async function listInternships(_req: Request, res: Response): Promise<void> {
  try {
    const internships = await query("SELECT * FROM internships ORDER BY deadline ASC");
    const apps = await query("SELECT internship_id, user_id, status FROM applications");
    const userId = _req.user?.userId ?? null;

    const items = internships.rows.map((i: any) => {
      const related = apps.rows.filter((a: any) => a.internship_id === i.id);
      const mine = related.find((a: any) => a.user_id === userId);
      return {
        _id: i.id,
        title: i.title,
        company: i.company,
        description: i.description ?? "",
        requirements: i.requirements ?? "",
        duration: i.duration ?? "",
        deadline: i.deadline,
        isOpen: i.is_open && new Date(i.deadline) > new Date(),
        applicationCount: related.length,
        myStatus: mine?.status ?? null,
        createdBy: i.created_by,
      };
    });
    res.json(items);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to list internships";
    res.status(500).json({ error: msg });
  }
}

export async function getInternship(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const result = await query("SELECT * FROM internships WHERE id = $1", [id]);
    if (!result.rowCount) {
      res.status(404).json({ error: "Internship not found" });
      return;
    }
    const i = result.rows[0];

    const apps = await query(
      "SELECT id, user_id, student_name, cover_note, status, feedback FROM applications WHERE internship_id = $1 ORDER BY created_at",
      [id],
    );

    res.json({
      _id: i.id,
      title: i.title,
      company: i.company,
      description: i.description ?? "",
      requirements: i.requirements ?? "",
      duration: i.duration ?? "",
      deadline: i.deadline,
      isOpen: i.is_open,
      createdBy: i.created_by,
      applications: apps.rows.map((a: any) => ({
        id: a.id,
        userId: a.user_id,
        studentName: a.student_name,
        coverNote: a.cover_note,
        status: a.status,
        feedback: a.feedback,
      })),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to get internship";
    res.status(500).json({ error: msg });
  }
}

export async function createInternship(req: Request, res: Response): Promise<void> {
  try {
    const { title, company, description, requirements, duration, deadline } = req.body;
    const createdBy = req.user!.userId;

    const result = await query(
      `INSERT INTO internships (title, company, description, requirements, duration, deadline, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [title, company, description ?? "", requirements ?? "", duration ?? "", new Date(deadline).toISOString(), createdBy],
    );

    const i = result.rows[0];
    res.status(201).json({
      _id: i.id,
      title: i.title,
      company: i.company,
      description: i.description ?? "",
      requirements: i.requirements ?? "",
      duration: i.duration ?? "",
      deadline: i.deadline,
      isOpen: i.is_open,
      applicationCount: 0,
      myStatus: null,
      createdBy: i.created_by,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to create internship";
    res.status(500).json({ error: msg });
  }
}

export async function updateInternship(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;
    const role = req.user!.role;

    const existing = await query("SELECT created_by FROM internships WHERE id = $1", [id]);
    if (!existing.rowCount) {
      res.status(404).json({ error: "Internship not found" });
      return;
    }
    if (existing.rows[0].created_by !== userId && role !== "admin") {
      res.status(403).json({ error: "Not authorized" });
      return;
    }

    const fields: string[] = [];
    const values: unknown[] = [];
    let i = 1;

    for (const [key, val] of Object.entries(req.body)) {
      if (val === undefined) continue;
      if (key === "deadline") {
        fields.push(`deadline = $${i}`);
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
      `UPDATE internships SET ${fields.join(", ")} WHERE id = $${i} RETURNING *`,
      values,
    );

    const item = result.rows[0];
    res.json({
      _id: item.id,
      title: item.title,
      company: item.company,
      description: item.description ?? "",
      deadline: item.deadline,
      isOpen: item.is_open,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to update internship";
    res.status(500).json({ error: msg });
  }
}

export async function deleteInternship(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;
    const role = req.user!.role;

    const existing = await query("SELECT created_by FROM internships WHERE id = $1", [id]);
    if (!existing.rowCount) {
      res.status(404).json({ error: "Internship not found" });
      return;
    }
    if (existing.rows[0].created_by !== userId && role !== "admin") {
      res.status(403).json({ error: "Not authorized" });
      return;
    }

    await query("DELETE FROM internships WHERE id = $1", [id]);
    res.json({ success: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to delete internship";
    res.status(500).json({ error: msg });
  }
}

export async function applyToInternship(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { studentName, coverNote } = req.body;
    const userId = req.user!.userId;

    try {
      await query(
        `INSERT INTO applications (internship_id, user_id, student_name, cover_note)
         VALUES ($1, $2, $3, $4)`,
        [id, userId, studentName, coverNote ?? ""],
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("closed")) {
        res.status(400).json({ error: "Applications for this internship are closed" });
        return;
      }
      if (msg.includes("duplicate") || msg.includes("23505")) {
        res.status(409).json({ error: "You have already applied to this internship" });
        return;
      }
      throw err;
    }

    res.status(201).json({ success: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to apply";
    res.status(500).json({ error: msg });
  }
}

export async function listApplications(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const result = await query(
      "SELECT id, user_id, student_name, cover_note, status, feedback FROM applications WHERE internship_id = $1 ORDER BY created_at",
      [id],
    );
    res.json(
      result.rows.map((a: any) => ({
        id: a.id,
        userId: a.user_id,
        studentName: a.student_name,
        coverNote: a.cover_note,
        status: a.status,
        feedback: a.feedback,
      })),
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to list applications";
    res.status(500).json({ error: msg });
  }
}

export async function evaluateApplication(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { status, feedback } = req.body;

    const result = await query(
      "UPDATE applications SET status = $1, feedback = $2 WHERE id = $3 RETURNING *",
      [status, feedback ?? "", id],
    );
    if (!result.rowCount) {
      res.status(404).json({ error: "Application not found" });
      return;
    }
    res.json({ success: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to evaluate";
    res.status(500).json({ error: msg });
  }
}
