-- Module Recipes: recipes with their steps (jsonb) and server-side starter recipes.

create table public.recipes (
    id uuid primary key,
    user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
    name text not null check (char_length(name) between 1 and 100),
    method text not null check (method in ('espresso', 'v60', 'cold_brew')),
    dose_g numeric(5, 1) not null check (dose_g > 0 and dose_g <= 500),
    water_g numeric(6, 1) check (water_g > 0 and water_g <= 5000),
    yield_g numeric(5, 1) check (yield_g > 0 and yield_g <= 500),
    temperature_c smallint check (temperature_c between 0 and 100),
    grind_setting text,
    target_time_s integer check (target_time_s >= 0),
    target_time_max_s integer check (target_time_max_s >= 0),
    preinfusion_s integer check (preinfusion_s >= 0),
    steep_time_min integer check (steep_time_min between 1 and 4320),
    steep_place text check (steep_place in ('fridge', 'room')),
    dilution numeric(3, 1) check (dilution >= 0),
    steps jsonb not null default '[]',
    coffee_id uuid references public.coffees (id) on delete set null,
    is_favorite boolean not null default false,
    notes text,
    last_brewed_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    deleted_at timestamptz
);

create index recipes_user_updated_idx on public.recipes (user_id, updated_at);

create trigger recipes_set_updated_at
    before insert or update on public.recipes
    for each row execute function public.set_updated_at();

alter table public.recipes enable row level security;

create policy "recipes: own rows" on public.recipes
    for all to authenticated
    using ((select auth.uid()) = user_id)
    with check ((select auth.uid()) = user_id);

-- Starter recipes, created once per user. Seeding on the server means two devices
-- signing in at the same time can never create duplicates.
create or replace function public.seed_recipes(target uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
    update public.profiles
    set recipes_seeded_at = now()
    where id = target and recipes_seeded_at is null;

    -- Already seeded (or no profile): nothing to do.
    if not found then
        return;
    end if;

    insert into public.recipes
        (id, user_id, name, method, dose_g, yield_g, temperature_c, target_time_s, target_time_max_s, steps)
    values
        (gen_random_uuid(), target, 'Classic Espresso', 'espresso', 18, 36, 93, 25, 30, '[]');

    insert into public.recipes
        (id, user_id, name, method, dose_g, water_g, temperature_c, target_time_s, steps)
    values
        (gen_random_uuid(), target, 'V60 Everyday', 'v60', 15, 250, 93, 180, '[
            {"type": "bloom", "at_s": 0, "target_water_g": 50, "text": "Pour gently and wet all the grounds"},
            {"type": "pour", "at_s": 45, "target_water_g": 150, "text": null},
            {"type": "pour", "at_s": 75, "target_water_g": 250, "text": null},
            {"type": "swirl", "at_s": 105, "target_water_g": null, "text": "Swirl gently and let it drain"}
        ]');

    insert into public.recipes
        (id, user_id, name, method, dose_g, water_g, grind_setting, steep_time_min, steep_place, dilution, steps)
    values
        (gen_random_uuid(), target, 'Cold Brew Concentrate', 'cold_brew', 100, 800, 'Coarse', 960, 'fridge', 1, '[
            {"type": "custom", "at_s": null, "target_water_g": null, "text": "Add the coarsely ground coffee to the jar"},
            {"type": "pour", "at_s": null, "target_water_g": 800, "text": "Add cold water"},
            {"type": "stir", "at_s": null, "target_water_g": null, "text": "Stir until all grounds are wet"},
            {"type": "wait", "at_s": null, "target_water_g": null, "text": "Steep in the fridge"},
            {"type": "filter", "at_s": null, "target_water_g": null, "text": "Filter through a paper filter"}
        ]');
end;
$$;

-- Internal only: never callable through the API.
revoke execute on function public.seed_recipes(uuid) from public, anon, authenticated;

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

    perform public.seed_recipes(new.id);

    return new;
end;
$$;

-- Existing users.
select public.seed_recipes(id) from public.profiles;
