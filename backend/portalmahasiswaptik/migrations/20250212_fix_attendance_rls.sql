-- Enable RLS on attendance_records if not already
alter table public.attendance_records enable row level security;

-- Policy for INSERT (admin_dev, admin_kelas, admin_dosen)
drop policy if exists "Enable insert for authorized roles" on public.attendance_records;
create policy "Enable insert for authorized roles"
on public.attendance_records for insert
to authenticated
with check (
  exists (
    select 1 from public.user_roles
    where user_roles.user_id = auth.uid()
    and user_roles.role in ('admin_dev', 'admin_kelas', 'admin_dosen')
  )
);

-- Policy for UPDATE (admin_dev, admin_kelas, admin_dosen)
drop policy if exists "Enable update for authorized roles" on public.attendance_records;
create policy "Enable update for authorized roles"
on public.attendance_records for update
to authenticated
using (
  exists (
    select 1 from public.user_roles
    where user_roles.user_id = auth.uid()
    and user_roles.role in ('admin_dev', 'admin_kelas', 'admin_dosen')
  )
)
with check (
  exists (
    select 1 from public.user_roles
    where user_roles.user_id = auth.uid()
    and user_roles.role in ('admin_dev', 'admin_kelas', 'admin_dosen')
  )
);

-- Policy for DELETE (admin_dev, admin_kelas, admin_dosen)
drop policy if exists "Enable delete for authorized roles" on public.attendance_records;
create policy "Enable delete for authorized roles"
on public.attendance_records for delete
to authenticated
using (
  exists (
    select 1 from public.user_roles
    where user_roles.user_id = auth.uid()
    and user_roles.role in ('admin_dev', 'admin_kelas', 'admin_dosen')
  )
);

-- Policy for SELECT (Authenticated users can view, typically)
-- Or restrict to relevant classes if needed, but for now allow read for authenticated to prevent "fetching" errors in UI
drop policy if exists "Enable read for authenticated" on public.attendance_records;
create policy "Enable read for authenticated"
on public.attendance_records for select
to authenticated
using (true);
