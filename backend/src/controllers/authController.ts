import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { query } from "../config/db";
import { env } from "../config/env";

function signToken(userId: string, email: string, role: string): string {
  return jwt.sign(
    { userId, email, role },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRY } as jwt.SignOptions,
  );
}

export async function register(req: Request, res: Response): Promise<void> {
  try {
    const { name, email, password, role } = req.body;

    // Check if email already exists
    const existing = await query("SELECT id FROM profiles WHERE email = $1", [email]);
    if (existing.rowCount && existing.rowCount > 0) {
      res.status(409).json({ error: "Email already registered" });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);

    // Insert profile (acts as user creation — replaces the Supabase auth trigger)
    const profileResult = await query(
      `INSERT INTO profiles (name, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, name, email, created_at`,
      [name, email, passwordHash],
    );
    const profile = profileResult.rows[0];

    // Insert role (replaces the auto-provisioning trigger)
    await query(
      "INSERT INTO user_roles (user_id, role) VALUES ($1, $2)",
      [profile.id, role],
    );

    const token = signToken(profile.id, profile.email, role);

    res.status(201).json({
      token,
      user: {
        _id: profile.id,
        name: profile.name,
        email: profile.email,
        role,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Registration failed";
    console.error("Register error:", msg);
    res.status(500).json({ error: msg });
  }
}

export async function login(req: Request, res: Response): Promise<void> {
  try {
    const { email, password } = req.body;

    const result = await query(
      "SELECT id, name, email, password_hash FROM profiles WHERE email = $1",
      [email],
    );
    if (!result.rowCount || result.rowCount === 0) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    // Get user's role
    const roleResult = await query(
      "SELECT role FROM user_roles WHERE user_id = $1",
      [user.id],
    );
    const role = roleResult.rows[0]?.role ?? "student";

    const token = signToken(user.id, user.email, role);

    res.json({
      token,
      user: {
        _id: user.id,
        name: user.name,
        email: user.email,
        role,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Login failed";
    console.error("Login error:", msg);
    res.status(500).json({ error: msg });
  }
}

export async function me(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }

    const result = await query(
      "SELECT id, name, email FROM profiles WHERE id = $1",
      [req.user.userId],
    );
    if (!result.rowCount) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const roleResult = await query(
      "SELECT role FROM user_roles WHERE user_id = $1",
      [req.user.userId],
    );

    const profile = result.rows[0];
    res.json({
      _id: profile.id,
      name: profile.name,
      email: profile.email,
      role: roleResult.rows[0]?.role ?? "student",
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to fetch profile";
    console.error("Me error:", msg);
    res.status(500).json({ error: msg });
  }
}
