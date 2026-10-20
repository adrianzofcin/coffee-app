-- Pour-over steps get a duration (pour speed), the bloom splits into a pour and a wait.
-- Only the starter recipe for new users changes; existing recipes are converted in the app.

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
            {"type": "bloom", "at_s": 0, "duration_s": 10, "target_water_g": 50, "text": "Pour gently and wet all the grounds"},
            {"type": "wait", "at_s": 10, "duration_s": 30, "target_water_g": null, "text": "Let it bloom"},
            {"type": "pour", "at_s": 40, "duration_s": 15, "target_water_g": 150, "text": null},
            {"type": "wait", "at_s": 55, "duration_s": 15, "target_water_g": null, "text": null},
            {"type": "pour", "at_s": 70, "duration_s": 15, "target_water_g": 250, "text": null},
            {"type": "swirl", "at_s": 85, "duration_s": 5, "target_water_g": null, "text": "Swirl gently and let it drain"}
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
