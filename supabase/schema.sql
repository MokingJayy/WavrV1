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
  role text not null default 'artist' check (role in ('artist', 'engineer', 'manager', 'admin')),
  created_at timestamptz not null default now()
);

-- Création auto du profil à l'inscription
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', ''));
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


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
-- 4. TRACKS — The Vault
-- ============================================================
create table public.tracks (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  version text not null default 'untitled' check (version in ('mixup', 'untitled', 'final', 'master')),
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
  ('général', 'Canal principal', '{artist,engineer,manager,admin}'),
  ('ingé-son', 'Canal ingénieurs du son', '{engineer,admin}'),
  ('artistes', 'Canal artistes', '{artist,admin}'),
  ('management', 'Canal management', '{manager,admin}');


-- ============================================================
-- 7. TIMELINE EVENTS
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
-- 11. STORAGE BUCKETS
-- ============================================================
insert into storage.buckets (id, name, public) values
  ('audio', 'audio', false),
  ('covers', 'covers', true),
  ('documents', 'documents', false)
on conflict do nothing;


-- ============================================================
-- 12. RLS (Row Level Security)
-- ============================================================
alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.tracks enable row level security;
alter table public.cues enable row level security;
alter table public.channels enable row level security;
alter table public.messages enable row level security;
alter table public.timeline_events enable row level security;
alter table public.royalty_splits enable row level security;
alter table public.gallery_assets enable row level security;
alter table public.stage_setlists enable row level security;

-- Profiles : chacun voit tous les profils, modifie seulement le sien
create policy "Profiles visibles par tous" on public.profiles for select using (auth.role() = 'authenticated');
create policy "Profil modifiable par son owner" on public.profiles for update using (auth.uid() = id);

-- Projects, Tracks, Cues, Timeline, Royalties, Gallery, Stage : accessibles aux utilisateurs connectés
create policy "Lecture authentifiée" on public.projects for select using (auth.role() = 'authenticated');
create policy "Écriture authentifiée" on public.projects for insert with check (auth.role() = 'authenticated');

create policy "Lecture authentifiée" on public.tracks for select using (auth.role() = 'authenticated');
create policy "Écriture authentifiée" on public.tracks for insert with check (auth.role() = 'authenticated');
create policy "Suppression par owner" on public.tracks for delete using (auth.uid() = uploaded_by);

create policy "Lecture authentifiée" on public.cues for select using (auth.role() = 'authenticated');
create policy "Écriture authentifiée" on public.cues for insert with check (auth.role() = 'authenticated');
create policy "Modification par owner" on public.cues for update using (auth.uid() = author_id);

create policy "Canaux visibles" on public.channels for select using (auth.role() = 'authenticated');

create policy "Messages visibles" on public.messages for select using (auth.role() = 'authenticated');
create policy "Envoi messages" on public.messages for insert with check (auth.role() = 'authenticated');

create policy "Lecture authentifiée" on public.timeline_events for select using (auth.role() = 'authenticated');
create policy "Écriture authentifiée" on public.timeline_events for insert with check (auth.role() = 'authenticated');

create policy "Lecture authentifiée" on public.royalty_splits for select using (auth.role() = 'authenticated');
create policy "Écriture authentifiée" on public.royalty_splits for insert with check (auth.role() = 'authenticated');

create policy "Lecture authentifiée" on public.gallery_assets for select using (auth.role() = 'authenticated');
create policy "Écriture authentifiée" on public.gallery_assets for insert with check (auth.role() = 'authenticated');

create policy "Lecture authentifiée" on public.stage_setlists for select using (auth.role() = 'authenticated');
create policy "Écriture authentifiée" on public.stage_setlists for insert with check (auth.role() = 'authenticated');

-- Storage : audio et documents privés, covers publiques
create policy "Upload audio authentifié" on storage.objects for insert with check (bucket_id = 'audio' and auth.role() = 'authenticated');
create policy "Lecture audio authentifiée" on storage.objects for select using (bucket_id = 'audio' and auth.role() = 'authenticated');
create policy "Upload covers authentifié" on storage.objects for insert with check (bucket_id = 'covers' and auth.role() = 'authenticated');
create policy "Lecture covers publique" on storage.objects for select using (bucket_id = 'covers');
create policy "Upload documents authentifié" on storage.objects for insert with check (bucket_id = 'documents' and auth.role() = 'authenticated');
create policy "Lecture documents authentifiée" on storage.objects for select using (bucket_id = 'documents' and auth.role() = 'authenticated');
