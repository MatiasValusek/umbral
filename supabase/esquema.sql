-- Umbral — esquema de la nube (Etapa 8: cuentas y proyectos)
-- Cada usuario ve, crea, cambia y borra solo sus proyectos. Los archivos van al bucket privado
-- "proyectos" en <usuario>/<proyecto>/modelo.glb y miniatura.jpg.

create table public.proyectos (
  id uuid primary key default gen_random_uuid(),
  usuario uuid not null default auth.uid() references auth.users (id) on delete cascade,
  nombre text not null check (char_length(nombre) between 1 and 120),
  modelo jsonb not null,
  escena jsonb not null,
  tiene_modelo boolean not null default false,
  tiene_miniatura boolean not null default false,
  creado timestamptz not null default now(),
  actualizado timestamptz not null default now(),
  constraint escena_chica check (pg_column_size(escena) < 2000000)
);

create index proyectos_usuario_actualizado on public.proyectos (usuario, actualizado desc);

create function public.tocar_actualizado() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.actualizado := now();
  new.usuario := old.usuario; -- el dueño no se cambia
  return new;
end;
$$;
revoke execute on function public.tocar_actualizado() from public, anon, authenticated;

create trigger proyectos_actualizado before update on public.proyectos
for each row execute function public.tocar_actualizado();

alter table public.proyectos enable row level security;

create policy "ver mis proyectos" on public.proyectos for select to authenticated
  using ((select auth.uid()) = usuario);
create policy "crear mis proyectos" on public.proyectos for insert to authenticated
  with check ((select auth.uid()) = usuario);
create policy "cambiar mis proyectos" on public.proyectos for update to authenticated
  using ((select auth.uid()) = usuario) with check ((select auth.uid()) = usuario);
create policy "borrar mis proyectos" on public.proyectos for delete to authenticated
  using ((select auth.uid()) = usuario);

-- Las tablas nuevas no se exponen solas a la Data API: permisos explícitos solo para usuarios con sesión
revoke all on public.proyectos from anon;
grant select, insert, update, delete on public.proyectos to authenticated;

-- Almacenamiento: bucket privado, 50 MB por archivo (límite del plan gratis)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('proyectos', 'proyectos', false, 52428800, array['model/gltf-binary', 'image/jpeg']);

create policy "ver mis archivos" on storage.objects for select to authenticated
  using (bucket_id = 'proyectos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "subir mis archivos" on storage.objects for insert to authenticated
  with check (bucket_id = 'proyectos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "pisar mis archivos" on storage.objects for update to authenticated
  using (bucket_id = 'proyectos' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'proyectos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "borrar mis archivos" on storage.objects for delete to authenticated
  using (bucket_id = 'proyectos' and (storage.foldername(name))[1] = (select auth.uid())::text);
