-- "My words" — a child's personal vocabulary deck for language practice.
-- The child fully manages their OWN deck (add / edit / practice / delete); adults
-- in the family can manage too. Uses the same child-owned RLS helpers as chores /
-- child_event_checks. Safe to re-run.

create table if not exists public.child_words (
  id                uuid primary key default gen_random_uuid(),
  family_id         uuid not null references public.families(id) on delete cascade,
  child_profile_id  uuid not null references public.child_profiles(id) on delete cascade,
  term              text not null,                       -- word/phrase in the language being learned
  translation       text,                                -- in the child's native language (filled manually or by AI)
  example           text,                                -- one example sentence in the learned language
  distractors       jsonb not null default '[]'::jsonb,  -- 3 wrong-but-plausible MC options (native language)
  src_lang          text not null default 'es',          -- language being learned
  tgt_lang          text not null default 'ru',          -- child's native language
  box               int  not null default 1,             -- Leitner box 1..6
  due_date          date not null default current_date,  -- next review day
  last_result       boolean,                             -- last answer correct? (analytics/UI)
  enriched_at       timestamptz,                         -- null until AI (or manual) fills translation
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (child_profile_id, term, tgt_lang)
);

create index if not exists child_words_due_idx on public.child_words (child_profile_id, due_date);
create index if not exists child_words_family_idx on public.child_words (family_id);

alter table public.child_words enable row level security;
grant select, insert, update, delete on public.child_words to authenticated;

-- Adults in the family manage everything.
drop policy if exists "child_words_manage_adult" on public.child_words;
create policy "child_words_manage_adult" on public.child_words
  for all using (
    public.is_family_member(family_id) and not public.is_limited_member(family_id)
  ) with check (
    public.is_family_member(family_id) and not public.is_limited_member(family_id)
  );

-- The child fully manages their OWN deck (select / insert / update / delete),
-- scoped to their own profile only.
drop policy if exists "child_words_manage_own_child" on public.child_words;
create policy "child_words_manage_own_child" on public.child_words
  for all using (
    public.is_child_of(family_id) and child_profile_id = public.my_child_profile_id(family_id)
  ) with check (
    public.is_child_of(family_id) and child_profile_id = public.my_child_profile_id(family_id)
  );
