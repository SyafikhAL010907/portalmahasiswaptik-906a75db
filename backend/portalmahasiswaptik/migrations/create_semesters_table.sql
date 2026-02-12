-- Create semesters table
create table if not exists public.semesters (
  id serial primary key,
  name text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.semesters enable row level security;

-- Create policies
create policy "Enable read access for all users" on public.semesters
  for select using (true);

create policy "Enable insert for admins" on public.semesters
  for insert with check (
    auth.uid() in (
      select user_id from public.user_roles 
      where role in ('admin_dev', 'admin_kelas')
    )
  );

create policy "Enable update for admins" on public.semesters
  for update using (
    auth.uid() in (
      select user_id from public.user_roles 
      where role in ('admin_dev', 'admin_kelas')
    )
  );

create policy "Enable delete for admins" on public.semesters
  for delete using (
    auth.uid() in (
      select user_id from public.user_roles 
      where role in ('admin_dev', 'admin_kelas')
    )
  );

-- Insert default data
insert into public.semesters (name) values 
('Semester 1'), ('Semester 2'), ('Semester 3'), ('Semester 4'),
('Semester 5'), ('Semester 6'), ('Semester 7'), ('Semester 8');
