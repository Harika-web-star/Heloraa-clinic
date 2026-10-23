-- Public signup must never assign doctor/admin privileges from user metadata.
-- Apply this migration to existing Heloraa databases.
create or replace function public.heloraa_handle_new_auth_user()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  signup_role text := 'patient';
  display_name text;
begin
  -- The public signup UI only creates patient accounts. Clinic staff roles are
  -- provisioned separately by a trusted administrator.
  display_name := nullif(btrim(new.raw_user_meta_data->>'full_name'), '');

  insert into public.profiles (id, full_name, email, role)
  values (new.id, display_name, new.email, signup_role)
  on conflict (id) do update
    set full_name = coalesce(excluded.full_name, profiles.full_name),
        email = coalesce(excluded.email, profiles.email);

  insert into public.patients (profile_id)
  values (new.id)
  on conflict (profile_id) do nothing;

  return new;
end;
$$;
