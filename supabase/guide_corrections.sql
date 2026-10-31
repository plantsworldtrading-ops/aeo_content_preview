-- Care guide corrections from the review site (aeo_content_preview on Vercel).
--
-- Isolation from the ops data:
--   * The table lives in its own schema, content_review, which the Supabase API does not expose, has RLS on with
--     no policies, and grants nothing to anon/authenticated. The review site cannot read or change anything.
--   * The only entry point is public.submit_guide_correction(), which checks the shared passcode and inserts one row.
--     The review site calls it with the anon key; it never gets the service-role key.
--   * Reading the corrections back is done with the DB URL (aeo/scripts/corrections.py), never from the site.
--
-- Idempotent: safe to re-run. Set or change the passcode with content_review.set_passcode('...') afterwards.

create schema if not exists content_review;
revoke all on schema content_review from public, anon, authenticated;

create table if not exists content_review.settings (
  key text primary key,
  value text not null
);

create table if not exists content_review.guide_corrections (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  guide_handle text not null check (guide_handle ~ '^[a-z0-9-]{1,80}$'),
  content_hash text not null check (content_hash ~ '^[0-9a-f]{8,64}$'),
  reviewer text not null check (char_length(btrim(reviewer)) between 1 and 80),
  -- [{claim_id, verdict: confirm|change|note, note}]
  items jsonb not null check (jsonb_typeof(items) = 'array' and jsonb_array_length(items) <= 200),
  overall text check (char_length(overall) <= 5000),
  status text not null default 'new' check (status in ('new', 'applied', 'rejected')),
  handled_note text,
  check (pg_column_size(items) <= 50000)
);
create index if not exists guide_corrections_guide_idx on content_review.guide_corrections (guide_handle, created_at desc);

alter table content_review.settings enable row level security;
alter table content_review.guide_corrections enable row level security;
revoke all on all tables in schema content_review from public, anon, authenticated;

-- Salted SHA-256 of the passcode; the passcode itself is never stored. Run as the owner only.
create or replace function content_review.set_passcode(p_passcode text)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_salt text := md5(random()::text || clock_timestamp()::text);
begin
  if char_length(p_passcode) < 10 then
    raise exception 'passcode must be at least 10 characters';
  end if;
  insert into content_review.settings (key, value)
  values ('passcode', v_salt || ':' || encode(sha256(convert_to(v_salt || p_passcode, 'UTF8')), 'hex'))
  on conflict (key) do update set value = excluded.value;
end;
$$;
revoke all on function content_review.set_passcode(text) from public, anon, authenticated;

create or replace function public.submit_guide_correction(
  p_passcode text,
  p_guide_handle text,
  p_content_hash text,
  p_reviewer text,
  p_items jsonb,
  p_overall text default null
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_stored text;
  v_id bigint;
begin
  select value into v_stored from content_review.settings where key = 'passcode';
  if v_stored is null
     or p_passcode is null
     or encode(sha256(convert_to(split_part(v_stored, ':', 1) || p_passcode, 'UTF8')), 'hex') <> split_part(v_stored, ':', 2)
  then
    perform pg_sleep(1);  -- slow down passcode guessing
    raise exception 'invalid passcode' using errcode = '28P01';
  end if;

  insert into content_review.guide_corrections (guide_handle, content_hash, reviewer, items, overall)
  values (p_guide_handle, p_content_hash, btrim(p_reviewer), coalesce(p_items, '[]'::jsonb), nullif(btrim(p_overall), ''))
  returning id into v_id;
  return v_id;
end;
$$;
revoke all on function public.submit_guide_correction(text, text, text, text, jsonb, text) from public;
grant execute on function public.submit_guide_correction(text, text, text, text, jsonb, text) to anon, authenticated;
