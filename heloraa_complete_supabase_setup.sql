-- Heloraa Clinic fresh Supabase setup.
-- Source reviewed: all files under src/ and supabase/migrations/20260923_free_rag.sql.
-- Execute once on a fresh Supabase project using the SQL Editor as postgres.

begin;

-- Extensions
create extension if not exists pgcrypto with schema extensions;
create extension if not exists vector with schema extensions;

-- Enums/types
-- NOT DETERMINABLE FROM SOURCE: no database enum declarations or complete value sets exist.
-- Role, status, type, severity, record_type, and gender are stored as text.

-- Base tables
-- profiles.id corresponds to auth.users.id through the signup trigger. The source does not
-- establish whether the project intended a declarative FK to auth.users; see final comments.
create table public.profiles (
  id uuid primary key,
  full_name text,
  email text,
  phone text,
  role text not null check (role in ('patient', 'doctor', 'admin'))
);

create table public.doctors (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique,
  specialization text,
  experience_years integer,
  created_at timestamptz not null default now()
);

create table public.patients (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique,
  date_of_birth date,
  gender text,
  blood_group text,
  assigned_doctor_id uuid
);

create table public.medical_records (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null,
  record_type text,
  title text,
  description text,
  diagnosis text,
  treatment text,
  vitals jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.medications (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null,
  medication_name text not null,
  dosage text,
  frequency text,
  instructions text,
  active boolean not null default true
);

create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null,
  doctor_id uuid not null,
  appointment_date date not null,
  appointment_time time not null,
  appointment_type text,
  reason text,
  status text not null default 'scheduled'
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  title text,
  message text not null,
  type text not null default 'general',
  read boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Supports both ai_interactions insert shapes found in AI routes.
create table public.ai_interactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  patient_id uuid,
  agent_type text,
  input_context jsonb,
  output jsonb,
  agent_name text,
  input_text text,
  output_text text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.ai_flags (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null,
  doctor_id uuid not null,
  severity text not null,
  message text not null,
  status text not null default 'open',
  created_at timestamptz not null default now()
);

-- admin/page.tsx explicitly documents that automation_logs has no created_at column.
create table public.automation_logs (
  id uuid primary key default gen_random_uuid(),
  workflow_name text not null,
  trigger_type text not null default 'n8n',
  status text not null default 'success',
  reference_id text,
  details jsonb not null default '{}'::jsonb
);

-- RAG table from the existing migration; record_id is text in that migration and app.
create table public.medical_record_embeddings (
  id uuid primary key default gen_random_uuid(),
  record_id text not null unique,
  patient_id uuid not null,
  content text not null,
  embedding extensions.vector(768) not null,
  embedding_model text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Foreign keys
alter table public.doctors add constraint doctors_profile_id_fkey
  foreign key (profile_id) references public.profiles(id) on delete cascade;
alter table public.patients add constraint patients_profile_id_fkey
  foreign key (profile_id) references public.profiles(id) on delete cascade;
alter table public.patients add constraint patients_assigned_doctor_id_fkey
  foreign key (assigned_doctor_id) references public.doctors(id) on delete set null;
alter table public.medical_records add constraint medical_records_patient_id_fkey
  foreign key (patient_id) references public.patients(id) on delete cascade;
alter table public.medications add constraint medications_patient_id_fkey
  foreign key (patient_id) references public.patients(id) on delete cascade;
alter table public.appointments add constraint appointments_patient_id_fkey
  foreign key (patient_id) references public.patients(id) on delete cascade;
alter table public.appointments add constraint appointments_doctor_id_fkey
  foreign key (doctor_id) references public.doctors(id) on delete restrict;
alter table public.notifications add constraint notifications_user_id_fkey
  foreign key (user_id) references public.profiles(id) on delete cascade;
alter table public.ai_interactions add constraint ai_interactions_user_id_fkey
  foreign key (user_id) references public.profiles(id) on delete set null;
alter table public.ai_interactions add constraint ai_interactions_patient_id_fkey
  foreign key (patient_id) references public.patients(id) on delete set null;
alter table public.ai_flags add constraint ai_flags_patient_id_fkey
  foreign key (patient_id) references public.patients(id) on delete cascade;
alter table public.ai_flags add constraint ai_flags_doctor_id_fkey
  foreign key (doctor_id) references public.doctors(id) on delete cascade;
alter table public.medical_record_embeddings add constraint medical_record_embeddings_patient_id_fkey
  foreign key (patient_id) references public.patients(id) on delete cascade;

-- Functions
create or replace function public.heloraa_is_admin()
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin');
$$;
revoke all on function public.heloraa_is_admin() from public;
grant execute on function public.heloraa_is_admin() to authenticated;

create or replace function public.heloraa_has_clinic_role()
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('patient', 'doctor', 'admin')
  );
$$;
revoke all on function public.heloraa_has_clinic_role() from public;
grant execute on function public.heloraa_has_clinic_role() to authenticated;

create or replace function public.heloraa_can_message(target_user_id uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select target_user_id = auth.uid()
    or public.heloraa_is_admin()
    or exists (
      select 1
      from public.patients patient
      join public.doctors doctor on doctor.id = patient.assigned_doctor_id
      where (patient.profile_id = auth.uid() and doctor.profile_id = target_user_id)
         or (patient.profile_id = target_user_id and doctor.profile_id = auth.uid())
    );
$$;
revoke all on function public.heloraa_can_message(uuid) from public;
grant execute on function public.heloraa_can_message(uuid) to authenticated;

-- Signup form supplies user_metadata.full_name and user_metadata.role. Clamp role to
-- patient/doctor; admin privilege can only be assigned separately by a trusted operator.
create or replace function public.heloraa_handle_new_auth_user()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  signup_role text;
  display_name text;
begin
  signup_role := case when new.raw_user_meta_data->>'role' = 'doctor' then 'doctor' else 'patient' end;
  display_name := nullif(new.raw_user_meta_data->>'full_name', '');
  insert into public.profiles (id, full_name, email, role)
  values (
    new.id,
    display_name,
    case when signup_role = 'patient' then new.email else null end,
    signup_role
  )
  on conflict (id) do update
    set full_name = excluded.full_name, email = excluded.email, role = excluded.role;
  if signup_role = 'doctor' then
    insert into public.doctors (profile_id)
    values (new.id)
    on conflict (profile_id) do nothing;
  else
    insert into public.patients (profile_id)
    values (new.id)
    on conflict (profile_id) do nothing;
  end if;
  return new;
end;
$$;

-- Triggers
 drop trigger if exists heloraa_on_auth_user_created on auth.users;
create trigger heloraa_on_auth_user_created
after insert on auth.users
for each row execute function public.heloraa_handle_new_auth_user();

-- Indexes
create index patients_assigned_doctor_id_idx on public.patients (assigned_doctor_id);
create index medical_records_patient_created_idx on public.medical_records (patient_id, created_at desc);
create index medications_patient_active_idx on public.medications (patient_id, active);
create index appointments_patient_date_time_idx on public.appointments (patient_id, appointment_date, appointment_time);
create index appointments_doctor_date_time_idx on public.appointments (doctor_id, appointment_date, appointment_time);
-- The booking route checks for an existing non-cancelled doctor/time slot.
-- This index enforces that invariant even when appointment RLS hides another patient's row.
create unique index appointments_active_doctor_slot_uidx
  on public.appointments (doctor_id, appointment_date, appointment_time)
  where status <> 'cancelled';
create index notifications_user_created_idx on public.notifications (user_id, created_at desc);
create index ai_interactions_created_idx on public.ai_interactions (created_at desc);
create index ai_flags_created_idx on public.ai_flags (created_at desc);
create index medical_record_embeddings_patient_idx on public.medical_record_embeddings (patient_id);
create index medical_record_embeddings_embedding_hnsw on public.medical_record_embeddings
  using hnsw (embedding extensions.vector_cosine_ops);

-- RAG retrieval function from the existing migration, scoped to owner, assigned doctor, or admin.
create or replace function public.match_medical_record_embeddings(
  query_embedding extensions.vector(768),
  match_patient_id uuid,
  match_count integer default 5
)
returns table (
  record_id text,
  content text,
  similarity real,
  metadata jsonb
)
language sql stable security definer
set search_path = public, extensions
as $$
  select e.record_id,
         e.content,
         (1 - (e.embedding <=> query_embedding))::real as similarity,
         e.metadata
  from public.medical_record_embeddings e
  where e.patient_id = match_patient_id
    and exists (
      select 1
      from public.patients p
      where p.id = match_patient_id
        and (
          p.profile_id = auth.uid()
          or exists (
            select 1 from public.doctors d
            where d.id = p.assigned_doctor_id and d.profile_id = auth.uid()
          )
          or public.heloraa_is_admin()
        )
    )
  order by e.embedding <=> query_embedding
  limit greatest(1, least(match_count, 20));
$$;
revoke all on function public.match_medical_record_embeddings(extensions.vector(768), uuid, integer) from public;
grant execute on function public.match_medical_record_embeddings(extensions.vector(768), uuid, integer) to authenticated;

-- RLS
alter table public.profiles enable row level security;
alter table public.doctors enable row level security;
alter table public.patients enable row level security;
alter table public.medical_records enable row level security;
alter table public.medications enable row level security;
alter table public.appointments enable row level security;
alter table public.notifications enable row level security;
alter table public.ai_interactions enable row level security;
alter table public.ai_flags enable row level security;
alter table public.automation_logs enable row level security;
alter table public.medical_record_embeddings enable row level security;

-- Policies
create policy profiles_scoped_read on public.profiles
for select to authenticated
using (
  id = auth.uid()
  or public.heloraa_is_admin()
  or exists (
    select 1 from public.doctors d
    where d.profile_id = profiles.id
      and public.heloraa_has_clinic_role()
  )
  or exists (
    select 1 from public.patients p
    join public.doctors d on d.id = p.assigned_doctor_id
    where p.profile_id = profiles.id and d.profile_id = auth.uid()
  )
  or exists (
    select 1 from public.patients p
    join public.doctors d on d.id = p.assigned_doctor_id
    where d.profile_id = profiles.id and p.profile_id = auth.uid()
  )
);

-- The authenticated /api/doctors endpoint is used by the booking page to list
-- available doctors; scope directory visibility to users with a clinic profile.
create policy doctors_clinic_read on public.doctors
for select to authenticated
using (public.heloraa_has_clinic_role());
create policy patients_scoped_read on public.patients
for select to authenticated
using (
  profile_id = auth.uid()
  or public.heloraa_is_admin()
  or exists (select 1 from public.doctors d where d.id = assigned_doctor_id and d.profile_id = auth.uid())
);
create policy medical_records_scoped_read on public.medical_records
for select to authenticated
using (
  exists (
    select 1 from public.patients p
    where p.id = patient_id
      and (p.profile_id = auth.uid() or public.heloraa_is_admin()
        or exists (select 1 from public.doctors d where d.id = p.assigned_doctor_id and d.profile_id = auth.uid()))
  )
);

create policy medications_scoped_read on public.medications
for select to authenticated
using (
  exists (
    select 1 from public.patients p
    where p.id = patient_id
      and (p.profile_id = auth.uid() or public.heloraa_is_admin()
        or exists (select 1 from public.doctors d where d.id = p.assigned_doctor_id and d.profile_id = auth.uid()))
  )
);

create policy appointments_scoped_read on public.appointments
for select to authenticated
using (
  public.heloraa_is_admin()
  or exists (select 1 from public.patients p where p.id = patient_id and p.profile_id = auth.uid())
  or exists (select 1 from public.doctors d where d.id = doctor_id and d.profile_id = auth.uid())
);
create policy appointments_patient_insert on public.appointments
for insert to authenticated
with check (
  status = 'scheduled'
  and exists (select 1 from public.patients p where p.id = patient_id and p.profile_id = auth.uid())
);
create policy notifications_scoped_read on public.notifications
for select to authenticated
using (
  user_id = auth.uid()
  or public.heloraa_is_admin()
  or (
    metadata->>'sender_id' = auth.uid()::text
    and public.heloraa_can_message(user_id)
  )
);
create policy notifications_scoped_insert on public.notifications
for insert to authenticated
with check (public.heloraa_can_message(user_id));
create policy ai_interactions_scoped_read on public.ai_interactions
for select to authenticated
using (user_id = auth.uid() or public.heloraa_is_admin());
create policy ai_interactions_scoped_insert on public.ai_interactions
for insert to authenticated
with check (
  public.heloraa_is_admin()
  or (
    user_id = auth.uid()
    and (
      patient_id is null
      or exists (select 1 from public.patients p where p.id = patient_id and p.profile_id = auth.uid())
      or exists (select 1 from public.patients p join public.doctors d on d.id = p.assigned_doctor_id
                 where p.id = patient_id and d.profile_id = auth.uid())
    )
  )
);

create policy ai_flags_clinician_read on public.ai_flags
for select to authenticated
using (
  public.heloraa_is_admin()
  or exists (
    select 1 from public.doctors d
    join public.patients p on p.assigned_doctor_id = d.id
    where d.id = ai_flags.doctor_id
      and d.profile_id = auth.uid()
      and p.id = ai_flags.patient_id
  )
);
create policy ai_flags_clinician_insert on public.ai_flags
for insert to authenticated
with check (
  public.heloraa_is_admin()
  or exists (
    select 1 from public.doctors d
    join public.patients p on p.assigned_doctor_id = d.id
    where d.id = ai_flags.doctor_id
      and d.profile_id = auth.uid()
      and p.id = ai_flags.patient_id
  )
);

create policy medical_record_embeddings_scoped_select on public.medical_record_embeddings
for select to authenticated
using (
  exists (select 1 from public.patients p where p.id = patient_id
    and (p.profile_id = auth.uid() or public.heloraa_is_admin()
      or exists (select 1 from public.doctors d where d.id = p.assigned_doctor_id and d.profile_id = auth.uid())))
);
create policy medical_record_embeddings_scoped_insert on public.medical_record_embeddings
for insert to authenticated
with check (
  exists (select 1 from public.patients p where p.id = patient_id
    and (p.profile_id = auth.uid() or public.heloraa_is_admin()
      or exists (select 1 from public.doctors d where d.id = p.assigned_doctor_id and d.profile_id = auth.uid())))
);
create policy medical_record_embeddings_scoped_update on public.medical_record_embeddings
for update to authenticated
using (
  exists (select 1 from public.patients p where p.id = patient_id
    and (p.profile_id = auth.uid() or public.heloraa_is_admin()
      or exists (select 1 from public.doctors d where d.id = p.assigned_doctor_id and d.profile_id = auth.uid())))
)
with check (
  exists (select 1 from public.patients p where p.id = patient_id
    and (p.profile_id = auth.uid() or public.heloraa_is_admin()
      or exists (select 1 from public.doctors d where d.id = p.assigned_doctor_id and d.profile_id = auth.uid())))
);
-- automation_logs is service-role only; no authenticated policy is created.

-- Required table privileges; row access remains constrained by RLS above.
grant select on public.profiles, public.doctors, public.patients,
  public.medical_records, public.medications to authenticated;
grant select, insert on public.ai_flags to authenticated;
grant select, insert on public.appointments, public.notifications, public.ai_interactions to authenticated;
grant select, insert, update on public.medical_record_embeddings to authenticated;
grant all on public.profiles, public.doctors, public.patients, public.medical_records,
  public.medications, public.appointments, public.notifications, public.ai_interactions,
  public.ai_flags, public.automation_logs, public.medical_record_embeddings to service_role;

-- Fictional demo seed data. These profiles are not Auth users.
insert into public.profiles (id, full_name, email, role) values
  ('10000000-0000-4000-8000-000000000001', 'Dr. Ananya Rao', null, 'doctor'),
  ('20000000-0000-4000-8000-000000000001', 'Samanvitha', 'samanvitha.demo@example.invalid', 'patient'),
  ('20000000-0000-4000-8000-000000000002', 'Laasya', 'laasya.demo@example.invalid', 'patient'),
  ('20000000-0000-4000-8000-000000000003', 'Vaadyuthi', 'vaadyuthi.demo@example.invalid', 'patient'),
  ('20000000-0000-4000-8000-000000000004', 'Harika', 'harika.demo@example.invalid', 'patient');

insert into public.doctors (id, profile_id, specialization, experience_years) values
  ('30000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'General Medicine', 12);

insert into public.patients (id, profile_id, date_of_birth, gender, blood_group, assigned_doctor_id) values
  ('40000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', '1998-04-12', 'Female', 'O+', '30000000-0000-4000-8000-000000000001'),
  ('40000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000002', '2001-09-23', 'Female', 'B+', '30000000-0000-4000-8000-000000000001'),
  ('40000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000003', '1995-02-08', 'Female', 'A+', '30000000-0000-4000-8000-000000000001'),
  ('40000000-0000-4000-8000-000000000004', '20000000-0000-4000-8000-000000000004', '2000-11-17', 'Female', 'AB+', '30000000-0000-4000-8000-000000000001');

commit;

-- NOT DETERMINABLE FROM SOURCE: profile-to-auth.users declarative FK, DB enum values,
-- production Auth providers, SMTP settings, redirect URLs, and actual demo account credentials.
-- Auth setup: create/confirm real users separately. Signup metadata role is clamped to patient/doctor.
-- Admin users must be provisioned by a trusted operator by setting public.profiles.role='admin'.
-- No auth.users rows are inserted by this script.

