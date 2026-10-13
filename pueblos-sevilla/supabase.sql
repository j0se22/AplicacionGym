-- Base de datos para compartir las valoraciones entre todos los usuarios de la app.
-- Pégalo en Supabase → SQL Editor → New query → Run.
-- Además, activa Authentication → Sign In / Providers → «Allow anonymous sign-ins».
--
-- Cualquiera puede LEER todo; cada móvil (sesión anónima) solo puede crear, editar y borrar lo suyo.

create table if not exists public.reviews (
  id text primary key check (id ~ '^[A-Za-z0-9_-]{1,64}$'),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  town_id text not null check (char_length(town_id) <= 64),
  author text not null default '' check (char_length(author) <= 40),
  date date not null,
  scores jsonb not null,
  comment text not null default '' check (char_length(comment) <= 2000),
  tip text not null default '' check (char_length(tip) <= 300),
  photos text[] not null default '{}' check (cardinality(photos) <= 6),
  updated_at bigint not null
);

create table if not exists public.places (
  id text primary key check (id ~ '^[A-Za-z0-9_-]{1,64}$'),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  town_id text not null check (char_length(town_id) <= 64),
  name text not null check (char_length(name) between 1 and 80),
  kind text not null check (kind in ('comer', 'dormir', 'ver', 'otro')),
  score int check (score between 1 and 5),
  note text not null default '' check (char_length(note) <= 500),
  author text not null default '' check (char_length(author) <= 40),
  updated_at bigint not null
);

alter table public.reviews enable row level security;
alter table public.places enable row level security;

do $$
declare t text;
begin
  foreach t in array array['reviews', 'places'] loop
    execute format('drop policy if exists "leer" on public.%I', t);
    execute format('drop policy if exists "crear" on public.%I', t);
    execute format('drop policy if exists "editar" on public.%I', t);
    execute format('drop policy if exists "borrar" on public.%I', t);
    execute format('create policy "leer" on public.%I for select using (true)', t);
    execute format('create policy "crear" on public.%I for insert to authenticated with check (user_id = auth.uid())', t);
    execute format('create policy "editar" on public.%I for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid())', t);
    execute format('create policy "borrar" on public.%I for delete to authenticated using (user_id = auth.uid())', t);
  end loop;
end $$;

-- Fotos: carpeta pública «fotos», cada móvil sube a su propia subcarpeta (máx. 2 MB, solo JPEG).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('fotos', 'fotos', true, 2000000, array['image/jpeg'])
on conflict (id) do nothing;

drop policy if exists "fotos ver" on storage.objects;
drop policy if exists "fotos subir" on storage.objects;
drop policy if exists "fotos cambiar" on storage.objects;
drop policy if exists "fotos borrar" on storage.objects;
-- (ver la propia carpeta hace falta para poder reemplazar una foto al reintentar una subida)
create policy "fotos ver" on storage.objects for select to authenticated
  using (bucket_id = 'fotos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "fotos subir" on storage.objects for insert to authenticated
  with check (bucket_id = 'fotos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "fotos cambiar" on storage.objects for update to authenticated
  using (bucket_id = 'fotos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "fotos borrar" on storage.objects for delete to authenticated
  using (bucket_id = 'fotos' and (storage.foldername(name))[1] = auth.uid()::text);
