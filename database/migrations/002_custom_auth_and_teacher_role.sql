-- Migration 002: Custom Auth & Teacher Role
-- This migration adds the fields needed for JWT-based custom authentication.
-- The original Supabase schema relied on auth.users for authentication and
-- on_auth_user_created trigger for auto-provisioning profiles. Both are absent
-- on plain PostgreSQL, so we add password_hash directly to profiles and
-- handle profile/role creation in the Express POST /api/auth/register handler.

-- Add password_hash to profiles for bcrypt-based custom auth
ALTER TABLE public.profiles ADD COLUMN password_hash TEXT NOT NULL DEFAULT '';

-- Add indexes for auth performance
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles (user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id_read ON public.notifications (user_id, read);
CREATE INDEX IF NOT EXISTS idx_events_created_by ON public.events (created_by);
CREATE INDEX IF NOT EXISTS idx_internships_created_by ON public.internships (created_by);
CREATE INDEX IF NOT EXISTS idx_registrations_event_id ON public.registrations (event_id);
CREATE INDEX IF NOT EXISTS idx_applications_internship_id ON public.applications (internship_id);
