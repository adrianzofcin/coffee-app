-- Module Brew: every brew (timed run, cold brew or quick log) with a copy of its recipe.

create table public.brews (
    id uuid primary key,
    user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
    recipe_id uuid references public.recipes (id) on delete set null,
    -- Optional: a brew can be logged without picking a coffee.
    bag_id uuid references public.bags (id) on delete set null,
    method text not null check (method in ('espresso', 'v60', 'cold_brew')),
    source text not null check (source in ('recipe', 'quick_log')),
    status text not null default 'completed' check (status in ('steeping', 'completed')),
    started_at timestamptz not null,
    finished_at timestamptz,
    steep_ends_at timestamptz,
    dose_g numeric(5, 1) not null check (dose_g > 0 and dose_g <= 500),
    water_g numeric(6, 1) check (water_g > 0 and water_g <= 5000),
    yield_g numeric(5, 1) check (yield_g > 0 and yield_g <= 500),
    brew_time_s integer check (brew_time_s >= 0),
    rating smallint check (rating between 1 and 5),
    taste_tags text[] not null default '{}',
    notes text,
    recipe_snapshot jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    deleted_at timestamptz
);

create index brews_user_updated_idx on public.brews (user_id, updated_at);
create index brews_bag_idx on public.brews (bag_id);
create index brews_recipe_idx on public.brews (recipe_id);

create trigger brews_set_updated_at
    before insert or update on public.brews
    for each row execute function public.set_updated_at();

alter table public.brews enable row level security;

create policy "brews: own rows" on public.brews
    for all to authenticated
    using ((select auth.uid()) = user_id)
    with check ((select auth.uid()) = user_id);
