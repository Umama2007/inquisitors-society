import { Request, Response } from "express";
import { query } from "../config/db";

export async function dashboard(_req: Request, res: Response): Promise<void> {
  try {
    const role = _req.user!.role;

    const [eventsCount, internshipsCount, totalRegs, totalApps] = await Promise.all([
      query("SELECT COUNT(*) AS cnt FROM events"),
      query("SELECT COUNT(*) AS cnt FROM internships"),
      query("SELECT COUNT(*) AS cnt FROM registrations"),
      query("SELECT COUNT(*) AS cnt FROM applications"),
    ]);

    const stats: Record<string, unknown> = {
      totalEvents: parseInt(eventsCount.rows[0].cnt, 10),
      totalInternships: parseInt(internshipsCount.rows[0].cnt, 10),
      totalRegistrations: parseInt(totalRegs.rows[0].cnt, 10),
      totalApplications: parseInt(totalApps.rows[0].cnt, 10),
      role,
    };

    if (role === "student") {
      const [myRegs, myApps] = await Promise.all([
        query("SELECT COUNT(*) AS cnt FROM registrations WHERE user_id = $1", [_req.user!.userId]),
        query("SELECT COUNT(*) AS cnt FROM applications WHERE user_id = $1", [_req.user!.userId]),
      ]);
      stats.myRegistrations = parseInt(myRegs.rows[0].cnt, 10);
      stats.myApplications = parseInt(myApps.rows[0].cnt, 10);
    }

    if (role === "teacher") {
      const [myEvents, myInternships] = await Promise.all([
        query("SELECT COUNT(*) AS cnt FROM events WHERE created_by = $1", [_req.user!.userId]),
        query("SELECT COUNT(*) AS cnt FROM internships WHERE created_by = $1", [_req.user!.userId]),
      ]);
      stats.myEvents = parseInt(myEvents.rows[0].cnt, 10);
      stats.myInternships = parseInt(myInternships.rows[0].cnt, 10);
    }

    res.json(stats);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to get dashboard";
    res.status(500).json({ error: msg });
  }
}

export async function eventAnalytics(_req: Request, res: Response): Promise<void> {
  try {
    const events = await query(
      "SELECT id, title, capacity, COALESCE(registered_count, 0) AS registered_count FROM events ORDER BY event_date",
    );

    const rows = events.rows.map((e: any) => ({
      id: e.id,
      title: e.title,
      capacity: e.capacity,
      registered: parseInt(e.registered_count, 10),
      fill: e.capacity ? Math.round((parseInt(e.registered_count, 10) / e.capacity) * 100) : 0,
    }));

    res.json(rows);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to get analytics";
    res.status(500).json({ error: msg });
  }
}

export async function internshipAnalytics(_req: Request, res: Response): Promise<void> {
  try {
    const internships = await query("SELECT * FROM internships ORDER BY deadline");
    const apps = await query(
      "SELECT internship_id, COUNT(*) AS cnt, COUNT(*) FILTER (WHERE status = 'Selected') AS selected, COUNT(*) FILTER (WHERE status = 'Rejected') AS rejected FROM applications GROUP BY internship_id",
    );

    const rows = internships.rows.map((i: any) => {
      const stats = apps.rows.find((a: any) => a.internship_id === i.id);
      return {
        _id: i.id,
        title: i.title,
        company: i.company,
        applications: stats ? parseInt(stats.cnt, 10) : 0,
        selected: stats ? parseInt(stats.selected, 10) : 0,
        rejected: stats ? parseInt(stats.rejected, 10) : 0,
      };
    });

    res.json(rows);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to get analytics";
    res.status(500).json({ error: msg });
  }
}
