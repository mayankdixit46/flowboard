create table if not exists board (
  stage text primary key,
  document jsonb not null,
  revision bigint not null default 1,
  updated_at timestamptz not null default now(),
  updated_by text not null default ''
);

create table if not exists board_activity (
  id bigserial primary key,
  stage text not null,
  revision bigint not null,
  actor_name text not null,
  actor_sub text not null,
  summary text not null,
  created_at timestamptz not null default now()
);

create index if not exists board_activity_stage_id_idx on board_activity (stage, id desc);
