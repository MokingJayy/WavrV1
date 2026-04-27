export type UserRole = "artist" | "engineer" | "manager" | "admin";

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  role: UserRole;
  created_at: string;
}

export interface Track {
  id: string;
  title: string;
  version: "mixup" | "untitled" | "final" | "master";
  bpm?: number;
  key?: string;
  duration_seconds?: number;
  file_url: string;
  waveform_url?: string;
  uploaded_by: string;
  project_id: string;
  created_at: string;
  updated_at: string;
}

export interface Cue {
  id: string;
  track_id: string;
  timestamp_seconds: number;
  content: string;
  author_id: string;
  author?: Profile;
  resolved: boolean;
  created_at: string;
}

export interface Message {
  id: string;
  channel_id: string;
  content: string;
  author_id: string;
  author?: Profile;
  created_at: string;
}

export interface Channel {
  id: string;
  name: string;
  description?: string;
  allowed_roles: UserRole[];
  created_at: string;
}

export interface TimelineEvent {
  id: string;
  title: string;
  description?: string;
  event_type: "release" | "session" | "deadline" | "promo";
  date: string;
  project_id?: string;
  created_by: string;
}

export interface RoyaltySplit {
  id: string;
  track_id: string;
  profile_id: string;
  profile?: Profile;
  percentage: number;
  role: string;
}

export interface GalleryAsset {
  id: string;
  title: string;
  asset_type: "cover" | "promo" | "logo" | "other";
  file_url: string;
  thumbnail_url?: string;
  votes: number;
  uploaded_by: string;
  created_at: string;
}

export interface StageSetlist {
  id: string;
  event_name: string;
  event_date: string;
  venue?: string;
  bpm_notes?: string;
  technical_rider_url?: string;
  tracks: string[];
  created_by: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  cover_url?: string;
  created_by: string;
  created_at: string;
}
