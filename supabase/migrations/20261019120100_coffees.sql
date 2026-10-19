-- Module Coffees: coffees, bags, bag adjustments and the photos bucket.
-- Synced tables share: client-generated id, user_id, created_at, server-set updated_at, soft delete.

create table public.coffees (
    id uuid primary key,
    user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
    name text not null check (char_length(name) between 1 and 100),
    roaster text not null check (char_length(roaster) between 1 and 100),
    country text,
    region text,
    producer text,
    variety text,
    altitude text,
    process text,
    roast_level text check (roast_level in ('light', 'medium', 'dark')),
    intended_for text check (intended_for in ('espresso', 'filter', 'omni')),
    is_decaf boolean not null default false,
    tasting_notes text[] not null default '{}',
    rating smallint check (rating between 1 and 5),
    notes text,
    photo_path text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    deleted_at timestamptz
);

create table public.bags (
    id uuid primary key,
    user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
    coffee_id uuid not null references public.coffees (id) on delete cascade,
    roast_date date not null,
    weight_g integer not null check (weight_g between 1 and 5000),
    price numeric(8, 2) check (price >= 0),
    purchase_date date,
    status text not null default 'sealed' check (status in ('sealed', 'open', 'finished')),
    opened_at timestamptz,
    finished_at timestamptz,
    is_frozen boolean not null default false,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    deleted_at timestamptz
);

create table public.bag_adjustments (
    id uuid primary key,
    user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
    bag_id uuid not null references public.bags (id) on delete cascade,
    type text not null check (type in ('set_weight', 'remove')),
    delta_g numeric(7, 1) not null,
    measured_g numeric(7, 1),
    note text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    deleted_at timestamptz
);

create index coffees_user_updated_idx on public.coffees (user_id, updated_at);
create index bags_user_updated_idx on public.bags (user_id, updated_at);
create index bags_coffee_idx on public.bags (coffee_id);
create index bag_adjustments_user_updated_idx on public.bag_adjustments (user_id, updated_at);
create index bag_adjustments_bag_idx on public.bag_adjustments (bag_id);

-- updated_at is always server time, on insert too (clients send their local time).
create trigger coffees_set_updated_at
    before insert or update on public.coffees
    for each row execute function public.set_updated_at();

create trigger bags_set_updated_at
    before insert or update on public.bags
    for each row execute function public.set_updated_at();

create trigger bag_adjustments_set_updated_at
    before insert or update on public.bag_adjustments
    for each row execute function public.set_updated_at();

alter table public.coffees enable row level security;
alter table public.bags enable row level security;
alter table public.bag_adjustments enable row level security;

create policy "coffees: own rows" on public.coffees
    for all to authenticated
    using ((select auth.uid()) = user_id)
    with check ((select auth.uid()) = user_id);

create policy "bags: own rows" on public.bags
    for all to authenticated
    using ((select auth.uid()) = user_id)
    with check ((select auth.uid()) = user_id);

create policy "bag_adjustments: own rows" on public.bag_adjustments
    for all to authenticated
    using ((select auth.uid()) = user_id)
    with check ((select auth.uid()) = user_id);

-- Photos: private bucket, every user owns the folder named by their id.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('photos', 'photos', false, 2097152, array['image/webp', 'image/jpeg'])
on conflict (id) do nothing;

create policy "photos: read own" on storage.objects
    for select to authenticated
    using (bucket_id = 'photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "photos: insert own" on storage.objects
    for insert to authenticated
    with check (bucket_id = 'photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "photos: update own" on storage.objects
    for update to authenticated
    using (bucket_id = 'photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "photos: delete own" on storage.objects
    for delete to authenticated
    using (bucket_id = 'photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
