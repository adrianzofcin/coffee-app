-- Shared helpers and user profiles.

-- Server time is the sync cursor, so clients never decide updated_at.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

create table public.profiles (
    id uuid primary key references auth.users (id) on delete cascade,
    username text not null unique,
    display_name text,
    recipes_seeded_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles: read own" on public.profiles
    for select to authenticated
    using ((select auth.uid()) = id);

create policy "profiles: update own" on public.profiles
    for update to authenticated
    using ((select auth.uid()) = id)
    with check ((select auth.uid()) = id);

create trigger profiles_set_updated_at
    before update on public.profiles
    for each row execute function public.set_updated_at();

-- Every new auth user gets a profile; username = e-mail part before "@".
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
    insert into public.profiles (id, username)
    values (new.id, split_part(new.email, '@', 1))
    on conflict (id) do nothing;

    return new;
end;
$$;

create trigger on_auth_user_created
    after insert on auth.users
    for each row execute function public.handle_new_user();

-- Users created before this migration.
insert into public.profiles (id, username)
select id, split_part(email, '@', 1)
from auth.users
on conflict (id) do nothing;
