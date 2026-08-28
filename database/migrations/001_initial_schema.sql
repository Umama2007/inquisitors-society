-- Migration 001: Initial Schema (adapted for plain PostgreSQL)
-- Original source: database-schema-complete.sql (Supabase-specific, read-only reference)
-- Adapted by: removing all auth.users FK references (profiles.id uses gen_random_uuid()),
--             removing all GRANT statements (Supabase-specific roles: authenticated, anon, service_role),
--             removing all RLS policies and ENABLE ROW LEVEL SECURITY statements,
--             removing the on_auth_user_created trigger + handle_new_user() function (depends on auth.users),
--             removing has_role() and is_event_owner() RLS helper functions (depend on auth.uid()).
-- Authorization is now enforced in Express middleware (see backend/src/middleware/auth.ts and roleCheck.ts).

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Role enum (extended to include 'teacher' — no separate migration needed since this is the baseline)
CREATE TYPE public.app_role AS ENUM ('admin', 'student', 'teacher');

-- Profiles table: acts as the primary users table (replaces Supabase's auth.users)
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX idx_profiles_email ON public.profiles (email);

-- User roles
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);

-- Events
CREATE TABLE public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  event_date timestamptz NOT NULL,
  location text NOT NULL,
  capacity integer NOT NULL DEFAULT 50,
  registered_count integer NOT NULL DEFAULT 0,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Registrations
CREATE TABLE public.registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  student_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, user_id)
);

-- Attendance
CREATE TABLE public.attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  student_name text NOT NULL,
  status text NOT NULL DEFAULT 'Present',
  marked_at timestamptz NOT NULL DEFAULT now(),
  marked_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- Notifications
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL DEFAULT '',
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Internships (from supabase/migrations/20260820000000_internships.sql, adapted)
CREATE TABLE public.internships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  company text NOT NULL,
  description text NOT NULL DEFAULT '',
  requirements text NOT NULL DEFAULT '',
  duration text NOT NULL DEFAULT '',
  deadline timestamptz NOT NULL,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  is_open boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Applications
CREATE TABLE public.applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  internship_id uuid NOT NULL REFERENCES public.internships(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  student_name text NOT NULL,
  cover_note text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'Applied',
  feedback text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (internship_id, user_id)
);

-- ========================
-- TRIGGER FUNCTIONS (useful, no auth dependency)
-- ========================

-- Enforce event capacity on registration
CREATE OR REPLACE FUNCTION public.check_event_capacity()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE cap integer; cnt integer;
BEGIN
  SELECT capacity INTO cap FROM public.events WHERE id = NEW.event_id;
  SELECT count(*) INTO cnt FROM public.registrations WHERE event_id = NEW.event_id;
  IF cnt >= cap THEN
    RAISE EXCEPTION 'Event is full';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER registrations_capacity BEFORE INSERT ON public.registrations
FOR EACH ROW EXECUTE FUNCTION public.check_event_capacity();

-- Notify all users when a new event is created
CREATE OR REPLACE FUNCTION public.notify_on_new_event()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  INSERT INTO public.notifications (user_id, title, message)
  SELECT p.id, 'New event: ' || NEW.title,
         'Happening at ' || NEW.location || ' on ' || to_char(NEW.event_date, 'DD Mon YYYY HH24:MI')
  FROM public.profiles p;
  RETURN NEW;
END;
$$;
CREATE TRIGGER events_notify AFTER INSERT ON public.events
FOR EACH ROW EXECUTE FUNCTION public.notify_on_new_event();

-- Notify user on successful registration
CREATE OR REPLACE FUNCTION public.notify_on_registration()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE ev record;
BEGIN
  SELECT title, location, event_date INTO ev FROM public.events WHERE id = NEW.event_id;
  INSERT INTO public.notifications (user_id, title, message)
  VALUES (NEW.user_id, 'Registered for ' || ev.title,
          'See you at ' || ev.location || ' on ' || to_char(ev.event_date, 'DD Mon YYYY HH24:MI'));
  RETURN NEW;
END;
$$;
CREATE TRIGGER registrations_notify AFTER INSERT ON public.registrations
FOR EACH ROW EXECUTE FUNCTION public.notify_on_registration();

-- Keep registered_count in sync
CREATE OR REPLACE FUNCTION public.sync_registered_count()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.events SET registered_count = registered_count + 1 WHERE id = NEW.event_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.events SET registered_count = GREATEST(registered_count - 1, 0) WHERE id = OLD.event_id;
  END IF;
  RETURN NULL;
END;
$$;
CREATE TRIGGER registrations_count AFTER INSERT OR DELETE ON public.registrations
FOR EACH ROW EXECUTE FUNCTION public.sync_registered_count();

-- Enforce internship deadline on application
CREATE OR REPLACE FUNCTION public.check_internship_deadline()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE dl timestamptz; open boolean;
BEGIN
  SELECT deadline, is_open INTO dl, open FROM public.internships WHERE id = NEW.internship_id;
  IF dl < now() OR open = false THEN
    RAISE EXCEPTION 'Applications for this internship are closed';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER applications_deadline_check BEFORE INSERT ON public.applications
FOR EACH ROW EXECUTE FUNCTION public.check_internship_deadline();
