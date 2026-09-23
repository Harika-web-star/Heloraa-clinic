-- Heloraa Clinic: zero-cost RAG layer
-- Uses Supabase Postgres + pgvector for retrieval and Gemini's free-tier
-- embedding model for vector generation.

create extension if not exists vector
with schema extensions;

create table if not exists public.medical_record_embeddings (
  id uuid primary key default gen_random_uuid(),
  record_id text not null unique,
  patient_id uuid not null,
  content text not null,
  embedding extensions.vector(768) not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists medical_record_embeddings_patient_idx
  on public.medical_record_embeddings(patient_id);

create index if not exists medical_record_embeddings_embedding_hnsw
  on public.medical_record_embeddings
  using hnsw (embedding extensions.vector_cosine_ops);

alter table public.medical_record_embeddings enable row level security;

drop policy if exists "Medical embeddings are readable by authorized users"
  on public.medical_record_embeddings;

create policy "Medical embeddings are readable by authorized users"
on public.medical_record_embeddings
for select
to authenticated
using (
  exists (
    select 1
    from public.patients p
    where p.id = medical_record_embeddings.patient_id
      and (
        p.profile_id = auth.uid()
        or exists (
          select 1
          from public.doctors d
          where d.id = p.assigned_doctor_id
            and d.profile_id = auth.uid()
        )
        or exists (
          select 1
          from public.profiles pr
          where pr.id = auth.uid()
            and pr.role = 'admin'
        )
      )
  )
);

drop policy if exists "Medical embeddings can be created by authorized users"
  on public.medical_record_embeddings;

create policy "Medical embeddings can be created by authorized users"
on public.medical_record_embeddings
for insert
to authenticated
with check (
  exists (
    select 1
    from public.patients p
    where p.id = medical_record_embeddings.patient_id
      and (
        p.profile_id = auth.uid()
        or exists (
          select 1
          from public.doctors d
          where d.id = p.assigned_doctor_id
            and d.profile_id = auth.uid()
        )
        or exists (
          select 1
          from public.profiles pr
          where pr.id = auth.uid()
            and pr.role = 'admin'
        )
      )
  )
);

drop policy if exists "Medical embeddings can be updated by authorized users"
  on public.medical_record_embeddings;

create policy "Medical embeddings can be updated by authorized users"
on public.medical_record_embeddings
for update
to authenticated
using (
  exists (
    select 1
    from public.patients p
    where p.id = medical_record_embeddings.patient_id
      and (
        p.profile_id = auth.uid()
        or exists (
          select 1
          from public.doctors d
          where d.id = p.assigned_doctor_id
            and d.profile_id = auth.uid()
        )
        or exists (
          select 1
          from public.profiles pr
          where pr.id = auth.uid()
            and pr.role = 'admin'
        )
      )
  )
)
with check (
  exists (
    select 1
    from public.patients p
    where p.id = medical_record_embeddings.patient_id
      and (
        p.profile_id = auth.uid()
        or exists (
          select 1
          from public.doctors d
          where d.id = p.assigned_doctor_id
            and d.profile_id = auth.uid()
        )
        or exists (
          select 1
          from public.profiles pr
          where pr.id = auth.uid()
            and pr.role = 'admin'
        )
      )
  )
);

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
language sql
stable
security definer
set search_path = public, extensions
as $$
  select
    e.record_id,
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
            select 1
            from public.doctors d
            where d.id = p.assigned_doctor_id
              and d.profile_id = auth.uid()
          )
          or exists (
            select 1
            from public.profiles pr
            where pr.id = auth.uid()
              and pr.role = 'admin'
          )
        )
    )
  order by e.embedding <=> query_embedding
  limit greatest(1, least(match_count, 20));
$$;

revoke all on function public.match_medical_record_embeddings(
  extensions.vector(768), uuid, integer
) from public;

grant execute on function public.match_medical_record_embeddings(
  extensions.vector(768), uuid, integer
) to authenticated;
