import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { query } from "../config/db";

export interface AuthUser {
  userId: string;
  email: string;
  role: "admin" | "student" | "teacher";
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    const token = header.slice(7);
    const payload = jwt.verify(token, env.JWT_SECRET) as AuthUser;

    // Verify user still exists in DB
    const result = await query(
      "SELECT id FROM profiles WHERE id = $1",
      [payload.userId],
    );
    if (result.rowCount === 0) {
      res.status(401).json({ error: "User no longer exists" });
      return;
    }

    req.user = payload;
    next();
  } catch (err: unknown) {
    if (err instanceof jwt.TokenExpiredError) {
      res.status(401).json({ error: "Token expired" });
      return;
    }
    res.status(401).json({ error: "Invalid token" });
  }
}
