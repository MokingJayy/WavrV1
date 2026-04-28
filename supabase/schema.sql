-- ============================================================
-- PROJET SECRET — Schema Supabase
-- Coller dans : Supabase > SQL Editor > New Query
-- ============================================================


-- ============================================================
-- 1. EXTENSIONS
-- ============================================================
create extension if not exists "uuid-ossp";


-- ============================================================
-- 2. PROFILES (liés aux utilisateurs Supabase Auth)
-- ============================================================
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text not null,
  full_name text not null default '',
  avatar_url text,
  role text not null default 'artist' check (role in ('artist', 'engineer', 'manager', 'admin', 'guest')),
  is_approved boolean not null default false,
  created_at timestamptz not null default now()
);

-- Création auto du profil à l'inscription
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'role', 'artist')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Retourne true si l'utilisateur courant est approuvé
create or replace function public.is_approved_member()
returns boolean as $$
  select coalesce(
    (select is_approved from public.profiles where id = auth.uid()),
    false
  );
$$ language sql security definer stable;


-- ============================================================
-- 3. PROJECTS
-- ============================================================
create table public.projects (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  description text,
  cover_url text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);


-- ============================================================
-- 4. PROJECT MEMBERS & INVITATIONS
-- ============================================================
create table public.project_members (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid references public.projects(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  role text not null default 'member' check (role in ('owner', 'admin', 'member', 'viewer')),
  joined_at timestamptz not null default now(),
  unique(project_id, user_id)
);

create table public.project_invitations (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid references public.projects(id) on delete cascade not null,
  token uuid not null unique default uuid_generate_v4(),
  created_by uuid references public.profiles(id) on delete set null,
  role text not null default 'member' check (role in ('admin', 'member', 'viewer')),
  max_uses integer not null default 100,
  use_count integer not null default 0,
  expires_at timestamptz not null default now() + interval '30 days',
  created_at timestamptz not null default now()
);

-- Ajoute automatiquement le créateur comme owner
create or replace function public.handle_new_project()
returns trigger as $$
begin
  insert into public.project_members (project_id, user_id, role)
  values (new.id, new.created_by, 'owner');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_project_created
  after insert on public.projects
  for each row execute procedure public.handle_new_project();

-- Rejoindre un projet via token d'invitation
create or replace function public.use_project_invitation(p_token uuid)
returns json as $$
declare
  inv record;
begin
  select pi.*, p.name as project_name
  into inv
  from public.project_invitations pi
  join public.projects p on p.id = pi.project_id
  where pi.token = p_token;

  if not found then
    return json_build_object('error', 'Invitation introuvable');
  end if;
  if inv.expires_at < now() then
    return json_build_object('error', 'Invitation expirée');
  end if;
  if inv.use_count >= inv.max_uses then
    return json_build_object('error', 'Invitation épuisée');
  end if;
  if exists (
    select 1 from public.project_members
    where project_id = inv.project_id and user_id = auth.uid()
  ) then
    return json_build_object('project_id', inv.project_id::text, 'already_member', true);
  end if;

  insert into public.project_members (project_id, user_id, role)
  values (inv.project_id, auth.uid(), inv.role);

  update public.project_invitations
  set use_count = use_count + 1
  where id = inv.id;

  return json_build_object('project_id', inv.project_id::text, 'success', true);
end;
$$ language plpgsql security definer;


-- ============================================================
-- 5. TRACKS — The Vault
-- ============================================================
create table public.tracks (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  version text not null default 'untitled' check (version in ('mixup', 'untitled', 'final', 'master', 'map', 'maquette')),
  bpm integer,
  key text,
  duration_seconds integer,
  file_url text not null,
  waveform_url text,
  project_id uuid references public.projects(id) on delete cascade,
  uploaded_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);


-- ============================================================
-- 5. CUES — Cue & Feedback
-- ============================================================
create table public.cues (
  id uuid primary key default uuid_generate_v4(),
  track_id uuid references public.tracks(id) on delete cascade not null,
  timestamp_seconds numeric not null,
  content text not null,
  author_id uuid references public.profiles(id) on delete set null,
  resolved boolean not null default false,
  created_at timestamptz not null default now()
);


-- ============================================================
-- 6. CHANNELS + MESSAGES — Studio Chat
-- ============================================================
create table public.channels (
  id uuid primary key default uuid_generate_v4(),
  name text not null unique,
  description text,
  allowed_roles text[] not null default '{artist,engineer,manager,admin}',
  created_at timestamptz not null default now()
);

create table public.messages (
  id uuid primary key default uuid_generate_v4(),
  channel_id uuid references public.channels(id) on delete cascade not null,
  content text not null,
  author_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Canaux par défaut
insert into public.channels (name, description, allowed_roles) values
  ('général', 'Canal principal', '{artist,engineer,manager,admin,guest}'),
  ('ingé-son', 'Canal ingénieurs du son', '{engineer,admin}'),
  ('artistes', 'Canal artistes', '{artist,admin}'),
  ('management', 'Canal management', '{manager,admin}'),
  ('invités', 'Canal invités', '{guest,admin}');


-- ============================================================
-- 7. NOTIFICATIONS
-- ============================================================
create table public.notifications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  type text not null default 'info' check (type in ('message', 'channel', 'system', 'info')),
  title text not null,
  body text,
  link text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index notifications_user_id_idx on public.notifications(user_id);
create index notifications_read_idx on public.notifications(user_id, read);

-- Trigger : notifie les membres du canal à chaque nouveau message
create or replace function public.notify_on_new_message()
returns trigger as $$
declare
  ch public.channels%rowtype;
  prof public.profiles%rowtype;
  author_name text;
begin
  select * into ch from public.channels where id = new.channel_id;
  select full_name into author_name from public.profiles where id = new.author_id;

  for prof in
    select * from public.profiles
    where role = any(ch.allowed_roles::text[])
      and id != new.author_id
      and is_approved = true
  loop
    insert into public.notifications (user_id, type, title, body, link)
    values (
      prof.id,
      'message',
      '#' || ch.name,
      coalesce(author_name, 'Quelqu''un') || ' a envoyé un message',
      '/chat'
    );
  end loop;
  return new;
end;
$$ language plpgsql security definer;

create trigger on_new_message_notify
  after insert on public.messages
  for each row execute procedure public.notify_on_new_message();


-- ============================================================
-- 8. TIMELINE EVENTS
-- ============================================================
create table public.timeline_events (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  description text,
  event_type text not null default 'session' check (event_type in ('release', 'session', 'deadline', 'promo')),
  date date not null,
  project_id uuid references public.projects(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);


-- ============================================================
-- 8. ROYALTY SPLITS — Royalties Hub
-- ============================================================
create table public.royalty_splits (
  id uuid primary key default uuid_generate_v4(),
  track_id uuid references public.tracks(id) on delete cascade not null,
  profile_id uuid references public.profiles(id) on delete cascade not null,
  percentage numeric not null check (percentage > 0 and percentage <= 100),
  role text not null,
  created_at timestamptz not null default now(),
  unique(track_id, profile_id)
);


-- ============================================================
-- 9. GALLERY ASSETS — The Gallery
-- ============================================================
create table public.gallery_assets (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  asset_type text not null default 'cover' check (asset_type in ('cover', 'promo', 'logo', 'other')),
  file_url text not null,
  thumbnail_url text,
  votes integer not null default 0,
  project_id uuid references public.projects(id) on delete cascade,
  uploaded_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);


-- ============================================================
-- 10. STAGE SETLISTS — Stage Prep
-- ============================================================
create table public.stage_setlists (
  id uuid primary key default uuid_generate_v4(),
  event_name text not null,
  event_date date not null,
  venue text,
  bpm_notes text,
  technical_rider_url text,
  track_ids uuid[] not null default '{}',
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);


-- ============================================================
-- 11. SESSIONS DAW — Sessions DAW
-- ============================================================
create table public.sessions (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  is_folder boolean not null default false,
  folder_id uuid references public.sessions(id) on delete cascade,
  daw text,
  file_url text,
  file_size bigint,
  notes text,
  uploaded_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);


-- ============================================================
-- 12. STORAGE BUCKETS
-- ============================================================
insert into storage.buckets (id, name, public) values
  ('audio', 'audio', false),
  ('covers', 'covers', true),
  ('documents', 'documents', false),
  ('avatars', 'avatars', true),
  ('sessions', 'sessions', false)
on conflict do nothing;


-- ============================================================
-- MIGRATION : si la BDD existe déjà, exécuter ces commandes
-- ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
-- ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check
--   CHECK (role IN ('artist', 'engineer', 'manager', 'admin', 'guest'));
-- ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_approved boolean not null default false;
-- UPDATE public.profiles SET is_approved = true; -- approuve les comptes existants
-- CREATE OR REPLACE FUNCTION public.is_approved_member() RETURNS boolean AS $$
--   SELECT COALESCE((SELECT is_approved FROM public.profiles WHERE id = auth.uid()), false);
-- $$ LANGUAGE sql SECURITY DEFINER STABLE;
-- ALTER TABLE public.tracks DROP CONSTRAINT IF EXISTS tracks_version_check;
-- ALTER TABLE public.tracks ADD CONSTRAINT tracks_version_check
--   CHECK (version IN ('mixup', 'untitled', 'final', 'master', 'map', 'maquette'));
-- CREATE POLICY "Modification tracks" ON public.tracks FOR UPDATE USING (public.is_approved_member());
-- DROP POLICY IF EXISTS "Lecture tracks" ON public.tracks;
-- CREATE POLICY "Lecture tracks" ON public.tracks FOR SELECT USING (public.is_approved_member() and auth.uid() = uploaded_by);
-- CREATE TABLE public.sessions (
--   id uuid primary key default uuid_generate_v4(),
--   title text not null,
--   is_folder boolean not null default false,
--   folder_id uuid references public.sessions(id) on delete cascade,
--   daw text,
--   file_url text,
--   file_size bigint,
--   notes text,
--   uploaded_by uuid references public.profiles(id) on delete set null,
--   created_at timestamptz not null default now(),
--   updated_at timestamptz not null default now()
-- );
-- insert into storage.buckets (id, name, public) values ('sessions', 'sessions', false) on conflict do nothing;
-- alter table public.sessions enable row level security;
-- create policy "Lecture sessions" on public.sessions for select using (public.is_approved_member() and auth.uid() = uploaded_by);
-- create policy "Écriture sessions" on public.sessions for insert with check (public.is_approved_member() and auth.uid() = uploaded_by);
-- create policy "Modification sessions" on public.sessions for update using (public.is_approved_member());
-- create policy "Suppression sessions" on public.sessions for delete using (public.is_approved_member() and auth.uid() = uploaded_by);
-- create policy "Upload sessions" on storage.objects for insert with check (bucket_id = 'sessions' and public.is_approved_member());
-- create policy "Lecture sessions" on storage.objects for select using (bucket_id = 'sessions' and public.is_approved_member());
-- -- Puis supprimer et recréer les policies (voir bloc RLS ci-dessous)
-- ============================================================


-- ============================================================
-- 12. RLS (Row Level Security)
-- ============================================================
alter table public.profiles enable row level security;
alter table public.notifications enable row level security;
alter table public.project_members enable row level security;
alter table public.project_invitations enable row level security;
alter table public.projects enable row level security;
alter table public.tracks enable row level security;
alter table public.cues enable row level security;
alter table public.channels enable row level security;
alter table public.messages enable row level security;
alter table public.timeline_events enable row level security;
alter table public.royalty_splits enable row level security;
alter table public.gallery_assets enable row level security;
alter table public.stage_setlists enable row level security;
alter table public.sessions enable row level security;

-- Profiles : lecture ouverte aux authentifiés (nécessaire pour vérifier is_approved)
create policy "Profiles visibles" on public.profiles for select using (auth.role() = 'authenticated');
create policy "Profil modifiable par son owner" on public.profiles for update using (auth.uid() = id);

-- Project members : membres peuvent se voir entre eux
create policy "Lecture members" on public.project_members for select using (
  exists (select 1 from public.project_members pm where pm.project_id = project_id and pm.user_id = auth.uid())
);
create policy "Rejoindre projet" on public.project_members for insert with check (auth.role() = 'authenticated');

-- Project invitations : membres peuvent lire et créer
create policy "Lecture invitations" on public.project_invitations for select using (auth.role() = 'authenticated');
create policy "Créer invitation" on public.project_invitations for insert with check (
  exists (select 1 from public.project_members where project_id = project_id and user_id = auth.uid() and role in ('owner', 'admin'))
);
create policy "Supprimer invitation" on public.project_invitations for delete using (
  exists (select 1 from public.project_members where project_id = project_id and user_id = auth.uid() and role in ('owner', 'admin'))
);

-- Notifications : chaque utilisateur voit et gère les siennes
create policy "Lecture notifs" on public.notifications for select using (auth.uid() = user_id);
create policy "Marquer comme lu" on public.notifications for update using (auth.uid() = user_id);
create policy "Supprimer notif" on public.notifications for delete using (auth.uid() = user_id);

-- Tout le reste : réservé aux membres approuvés
create policy "Lecture projets" on public.projects for select using (public.is_approved_member());
create policy "Écriture projets" on public.projects for insert with check (public.is_approved_member());

create policy "Lecture tracks" on public.tracks for select using (public.is_approved_member() and auth.uid() = uploaded_by);
create policy "Écriture tracks" on public.tracks for insert with check (public.is_approved_member());
create policy "Modification tracks" on public.tracks for update using (public.is_approved_member());
create policy "Suppression par owner" on public.tracks for delete using (public.is_approved_member() and auth.uid() = uploaded_by);

create policy "Lecture cues" on public.cues for select using (public.is_approved_member());
create policy "Écriture cues" on public.cues for insert with check (public.is_approved_member());
create policy "Modification par owner" on public.cues for update using (public.is_approved_member() and auth.uid() = author_id);

create policy "Canaux visibles" on public.channels for select using (public.is_approved_member());
create policy "Création de canal" on public.channels for insert with check (public.is_approved_member());

create policy "Messages visibles" on public.messages for select using (public.is_approved_member());
create policy "Envoi messages" on public.messages for insert with check (public.is_approved_member());

create policy "Lecture timeline" on public.timeline_events for select using (public.is_approved_member());
create policy "Écriture timeline" on public.timeline_events for insert with check (public.is_approved_member());

create policy "Lecture royalties" on public.royalty_splits for select using (public.is_approved_member());
create policy "Écriture royalties" on public.royalty_splits for insert with check (public.is_approved_member());

create policy "Lecture gallery" on public.gallery_assets for select using (public.is_approved_member());
create policy "Écriture gallery" on public.gallery_assets for insert with check (public.is_approved_member());

create policy "Lecture stage" on public.stage_setlists for select using (public.is_approved_member());
create policy "Écriture stage" on public.stage_setlists for insert with check (public.is_approved_member());

create policy "Lecture sessions" on public.sessions for select using (public.is_approved_member() and auth.uid() = uploaded_by);
create policy "Écriture sessions" on public.sessions for insert with check (public.is_approved_member() and auth.uid() = uploaded_by);
create policy "Modification sessions" on public.sessions for update using (public.is_approved_member());
create policy "Suppression sessions" on public.sessions for delete using (public.is_approved_member() and auth.uid() = uploaded_by);

-- Storage : réservé aux membres approuvés
create policy "Upload avatar" on storage.objects for insert with check (bucket_id = 'avatars' and auth.role() = 'authenticated');
create policy "Update avatar" on storage.objects for update using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "Lecture avatars publique" on storage.objects for select using (bucket_id = 'avatars');

create policy "Upload audio" on storage.objects for insert with check (bucket_id = 'audio' and public.is_approved_member());
create policy "Lecture audio" on storage.objects for select using (bucket_id = 'audio' and public.is_approved_member());
create policy "Upload covers" on storage.objects for insert with check (bucket_id = 'covers' and public.is_approved_member());
create policy "Lecture covers publique" on storage.objects for select using (bucket_id = 'covers');
create policy "Upload documents" on storage.objects for insert with check (bucket_id = 'documents' and public.is_approved_member());
create policy "Lecture documents" on storage.objects for select using (bucket_id = 'documents' and public.is_approved_member());
create policy "Upload sessions" on storage.objects for insert with check (bucket_id = 'sessions' and public.is_approved_member());
create policy "Lecture sessions" on storage.objects for select using (bucket_id = 'sessions' and public.is_approved_member());
