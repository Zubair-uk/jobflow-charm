
-- PROFILES
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  company TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "profiles_delete_own" ON public.profiles FOR DELETE USING (auth.uid() = id);

-- updated_at helper
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- LEADS
CREATE TABLE public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  property TEXT,
  status TEXT NOT NULL DEFAULT 'New',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "leads_select_own" ON public.leads FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "leads_insert_own" ON public.leads FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "leads_update_own" ON public.leads FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "leads_delete_own" ON public.leads FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER leads_updated_at BEFORE UPDATE ON public.leads
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX leads_user_id_idx ON public.leads(user_id);

-- AI REPLIES
CREATE TABLE public.ai_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  channel TEXT NOT NULL DEFAULT 'email',
  subject TEXT,
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'sent',
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.ai_replies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ai_replies_select_own" ON public.ai_replies FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "ai_replies_insert_own" ON public.ai_replies FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "ai_replies_update_own" ON public.ai_replies FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "ai_replies_delete_own" ON public.ai_replies FOR DELETE USING (auth.uid() = user_id);
CREATE INDEX ai_replies_user_id_idx ON public.ai_replies(user_id);

-- INTEGRATIONS
CREATE TABLE public.integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  connected BOOLEAN NOT NULL DEFAULT false,
  last_synced_at TIMESTAMPTZ,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, provider)
);
ALTER TABLE public.integrations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "integrations_select_own" ON public.integrations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "integrations_insert_own" ON public.integrations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "integrations_update_own" ON public.integrations FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "integrations_delete_own" ON public.integrations FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER integrations_updated_at BEFORE UPDATE ON public.integrations
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- SETTINGS
CREATE TABLE public.settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, key)
);
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "settings_select_own" ON public.settings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "settings_insert_own" ON public.settings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "settings_update_own" ON public.settings FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "settings_delete_own" ON public.settings FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER settings_updated_at BEFORE UPDATE ON public.settings
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
