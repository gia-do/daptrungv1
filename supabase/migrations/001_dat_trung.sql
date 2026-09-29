-- Đập Trứng — minimal shared-state schema
-- Run this in Supabase SQL Editor.
-- RLS is intentionally enabled. The public client should never receive service_role.

create extension if not exists pgcrypto;

do $$ begin
  create type public.room_status as enum ('WAITING','PLAYING','FINISHED','CLOSED');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.game_phase as enum ('REVEAL','PLAYING','FINISHED');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.action_type as enum ('HAMMER','BEER');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.outcome_type as enum ('HIT','MISS','CRITICAL');
exception when duplicate_object then null; end $$;

create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  host_code text not null check (host_code in ('host1','host2')),
  room_code text not null unique check (length(room_code)=4),
  status public.room_status not null default 'WAITING',
  max_players integer not null default 16 check (max_players between 2 and 16),
  created_at timestamptz not null default now(),
  closed_at timestamptz
);

create unique index if not exists rooms_one_active_per_host
  on public.rooms(host_code) where status <> 'CLOSED';

create table if not exists public.players (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  slot integer not null check (slot between 1 and 16),
  nickname text not null check (char_length(nickname) between 1 and 32),
  nickname_norm text not null,
  avatar text,
  is_host boolean not null default false,
  joined_at timestamptz not null default now(),
  unique(room_id, slot),
  unique(room_id, nickname_norm)
);

create table if not exists public.games (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  phase public.game_phase not null default 'REVEAL',
  beer_rate integer not null check (beer_rate between 5 and 20),
  hammer_rate integer not null check (hammer_rate between 80 and 95),
  miss_rate integer not null check (miss_rate between 5 and 20),
  critical_rate integer not null check (critical_rate between 5 and 20),
  hit_rate integer not null,
  turn_order uuid[] not null,
  current_index integer not null default 0,
  turn_number integer not null default 0,
  winner_id uuid references public.players(id),
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  check (miss_rate + critical_rate <= 40),
  check (hit_rate = 100 - miss_rate - critical_rate),
  unique(room_id, id)
);

create table if not exists public.game_players (
  game_id uuid not null references public.games(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  egg_hp integer not null,
  eliminated boolean not null default false,
  primary key(game_id, player_id)
);

create table if not exists public.turn_records (
  id bigint generated always as identity primary key,
  game_id uuid not null references public.games(id) on delete cascade,
  turn_number integer not null,
  player_id uuid not null references public.players(id),
  action public.action_type not null,
  outcome public.outcome_type not null,
  effect integer not null default 0,
  egg_before integer not null,
  egg_after integer not null,
  created_at timestamptz not null default now(),
  unique(game_id, turn_number)
);

create index if not exists players_room_idx on public.players(room_id);
create index if not exists games_room_idx on public.games(room_id);
create index if not exists turn_records_game_idx on public.turn_records(game_id, turn_number);

-- Realtime publication. Safe to run repeatedly.
alter publication supabase_realtime add table public.rooms;
alter publication supabase_realtime add table public.players;
alter publication supabase_realtime add table public.games;
alter publication supabase_realtime add table public.game_players;
alter publication supabase_realtime add table public.turn_records;

-- MVP security posture:
-- The next integration step should add narrow RLS policies for the exact public
-- client operations. Do NOT disable RLS globally and do NOT put service_role in GitHub.
