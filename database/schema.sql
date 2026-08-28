CREATE TYPE public.app_role AS ENUM ('admin','student');

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select_auth" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_roles_select_own" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email,'@',1)), COALESCE(NEW.email,''))
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, CASE WHEN NEW.raw_user_meta_data->>'role' = 'admin' THEN 'admin'::public.app_role ELSE 'student'::public.app_role END)
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TABLE public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  event_date timestamptz NOT NULL,
  location text NOT NULL,
  capacity integer NOT NULL DEFAULT 50,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.events TO authenticated;
GRANT SELECT ON public.events TO anon;
GRANT ALL ON public.events TO service_role;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "events_select_all" ON public.events FOR SELECT USING (true);
CREATE POLICY "events_admin_insert" ON public.events FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "events_admin_update" ON public.events FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "events_admin_delete" ON public.events FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  student_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, user_id)
);
GRANT SELECT, INSERT, DELETE ON public.registrations TO authenticated;
GRANT ALL ON public.registrations TO service_role;
ALTER TABLE public.registrations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reg_select" ON public.registrations FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "reg_insert_own" ON public.registrations FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "reg_delete" ON public.registrations FOR DELETE TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.check_event_capacity()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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

CREATE TABLE public.attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  student_name text NOT NULL,
  status text NOT NULL DEFAULT 'Present',
  marked_at timestamptz NOT NULL DEFAULT now(),
  marked_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.attendance TO authenticated;
GRANT ALL ON public.attendance TO service_role;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "att_select" ON public.attendance FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "att_admin_insert" ON public.attendance FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "att_admin_update" ON public.attendance FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "att_admin_delete" ON public.attendance FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL DEFAULT '',
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notif_select_own" ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "notif_insert_auth" ON public.notifications FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "notif_update_own" ON public.notifications FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "notif_delete_own" ON public.notifications FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.notify_on_new_event()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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

CREATE OR REPLACE FUNCTION public.notify_on_registration()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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
FOR EACH ROW EXECUTE FUNCTION public.notify_on_registration();REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.check_event_capacity() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_on_new_event() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_on_registration() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;ALTER TABLE public.events ADD COLUMN registered_count integer NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.sync_registered_count()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.events SET registered_count = registered_count + 1 WHERE id = NEW.event_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.events SET registered_count = GREATEST(registered_count - 1, 0) WHERE id = OLD.event_id;
  END IF;
  RETURN NULL;
END;
$$;
REVOKE ALL ON FUNCTION public.sync_registered_count() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER registrations_count AFTER INSERT OR DELETE ON public.registrations
FOR EACH ROW EXECUTE FUNCTION public.sync_registered_count();-- 1. Restrict profile reads
DROP POLICY IF EXISTS profiles_select_auth ON public.profiles;
CREATE POLICY profiles_select_own ON public.profiles
FOR SELECT TO authenticated
USING (id = auth.uid() OR public.has_role(auth.uid(), 'admin'::public.app_role));

-- 2. Restrict notification inserts to self
DROP POLICY IF EXISTS notif_insert_auth ON public.notifications;
CREATE POLICY notif_insert_own ON public.notifications
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

-- 3. Revoke direct EXECUTE on SECURITY DEFINER functions not meant to be called by users
REVOKE EXECUTE ON FUNCTION public.check_event_capacity() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.notify_on_new_event() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.notify_on_registration() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.sync_registered_count() FROM anon, authenticated, PUBLIC;

-- has_role must stay callable: it is used inside RLS policies evaluated as the calling role
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$function$;

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;-- Events: any signed-in user can create; organiser or admin can edit/delete
DROP POLICY IF EXISTS events_admin_insert ON public.events;
DROP POLICY IF EXISTS events_admin_update ON public.events;
DROP POLICY IF EXISTS events_admin_delete ON public.events;

CREATE POLICY events_insert_auth ON public.events
FOR INSERT TO authenticated
WITH CHECK (created_by = auth.uid());

CREATE POLICY events_update_owner ON public.events
FOR UPDATE TO authenticated
USING (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY events_delete_owner ON public.events
FOR DELETE TO authenticated
USING (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'::public.app_role));

-- Helper: is the current user the organiser of an event?
CREATE OR REPLACE FUNCTION public.is_event_owner(_event_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (SELECT 1 FROM public.events e WHERE e.id = _event_id AND e.created_by = auth.uid());
$$;
REVOKE EXECUTE ON FUNCTION public.is_event_owner(uuid) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_event_owner(uuid) TO authenticated;

-- Registrations: organisers can see sign-ups for their own events
DROP POLICY IF EXISTS reg_select ON public.registrations;
CREATE POLICY reg_select ON public.registrations
FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR public.is_event_owner(event_id)
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
);

DROP POLICY IF EXISTS reg_delete ON public.registrations;
CREATE POLICY reg_delete ON public.registrations
FOR DELETE TO authenticated
USING (
  user_id = auth.uid()
  OR public.is_event_owner(event_id)
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
);

-- Attendance: organisers can view and manage attendance for their own events
DROP POLICY IF EXISTS att_select ON public.attendance;
DROP POLICY IF EXISTS att_admin_insert ON public.attendance;
DROP POLICY IF EXISTS att_admin_update ON public.attendance;
DROP POLICY IF EXISTS att_admin_delete ON public.attendance;

CREATE POLICY att_select ON public.attendance
FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR public.is_event_owner(event_id)
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
);

CREATE POLICY att_insert_owner ON public.attendance
FOR INSERT TO authenticated
WITH CHECK (public.is_event_owner(event_id) OR public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY att_update_owner ON public.attendance
FOR UPDATE TO authenticated
USING (public.is_event_owner(event_id) OR public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.is_event_owner(event_id) OR public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY att_delete_owner ON public.attendance
FOR DELETE TO authenticated
USING (public.is_event_owner(event_id) OR public.has_role(auth.uid(), 'admin'::public.app_role));