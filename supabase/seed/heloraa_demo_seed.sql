-- Idempotent synthetic-only demo data. Run after the schema is installed.
-- These profiles are not Supabase Auth accounts and cannot sign in.
begin;

insert into public.profiles (id, full_name, email, role) values
  ('10000000-0000-4000-8000-000000000001', 'Dr. Ananya Rao', null, 'doctor'),
  ('20000000-0000-4000-8000-000000000001', 'Samanvitha Demo', 'samanvitha.demo@example.invalid', 'patient'),
  ('20000000-0000-4000-8000-000000000002', 'Laasya Demo', 'laasya.demo@example.invalid', 'patient'),
  ('20000000-0000-4000-8000-000000000003', 'Vaadyuthi Demo', 'vaadyuthi.demo@example.invalid', 'patient'),
  ('20000000-0000-4000-8000-000000000004', 'Harika Demo', 'harika.demo@example.invalid', 'patient')
on conflict (id) do update set full_name = excluded.full_name, email = excluded.email, role = excluded.role;

insert into public.doctors (id, profile_id, specialization, experience_years) values
  ('30000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'General Medicine', 12)
on conflict (id) do update set profile_id = excluded.profile_id, specialization = excluded.specialization, experience_years = excluded.experience_years;

insert into public.patients (id, profile_id, date_of_birth, gender, blood_group, assigned_doctor_id) values
  ('40000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', '1998-04-12', 'Female', 'O+', '30000000-0000-4000-8000-000000000001'),
  ('40000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000002', '2001-09-23', 'Female', 'B+', '30000000-0000-4000-8000-000000000001'),
  ('40000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000003', '1995-02-08', 'Female', 'A+', '30000000-0000-4000-8000-000000000001'),
  ('40000000-0000-4000-8000-000000000004', '20000000-0000-4000-8000-000000000004', '2000-11-17', 'Female', 'AB+', '30000000-0000-4000-8000-000000000001')
on conflict (id) do update set profile_id = excluded.profile_id, date_of_birth = excluded.date_of_birth, gender = excluded.gender, blood_group = excluded.blood_group, assigned_doctor_id = excluded.assigned_doctor_id;

insert into public.medical_records (id, patient_id, record_type, title, description, diagnosis, treatment, vitals, created_at) values
  ('50000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001', 'consultation', 'Routine wellness visit', 'Synthetic demo record only.', 'Routine wellness review', 'Hydration, sleep, and follow-up guidance', '{"blood_pressure":"118/76","heart_rate":72,"temperature_c":36.8}'::jsonb, now() - interval '5 days'),
  ('50000000-0000-4000-8000-000000000002', '40000000-0000-4000-8000-000000000002', 'lab', 'Annual screening', 'Synthetic demo record only.', 'Screening review pending', 'Review results at follow-up', '{"heart_rate":78}'::jsonb, now() - interval '2 days'),
  ('50000000-0000-4000-8000-000000000003', '40000000-0000-4000-8000-000000000003', 'consultation', 'Follow-up consultation', 'Synthetic demo record only.', 'Follow-up required', 'Schedule routine follow-up', '{}'::jsonb, now() - interval '1 day')
on conflict (id) do update set patient_id = excluded.patient_id, record_type = excluded.record_type, title = excluded.title, description = excluded.description, diagnosis = excluded.diagnosis, treatment = excluded.treatment, vitals = excluded.vitals, created_at = excluded.created_at;

insert into public.medications (id, patient_id, medication_name, dosage, frequency, instructions, active) values
  ('60000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001', 'Demo Vitamin Supplement', '1 tablet', 'Once daily', 'Synthetic demo entry only.', true),
  ('60000000-0000-4000-8000-000000000002', '40000000-0000-4000-8000-000000000002', 'Demo Saline Nasal Spray', 'As directed', 'As needed', 'Synthetic demo entry only.', true)
on conflict (id) do update set patient_id = excluded.patient_id, medication_name = excluded.medication_name, dosage = excluded.dosage, frequency = excluded.frequency, instructions = excluded.instructions, active = excluded.active;

insert into public.appointments (id, patient_id, doctor_id, appointment_date, appointment_time, appointment_type, reason, status) values
  ('70000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', current_date, '10:00', 'In-person', 'Routine wellness follow-up (synthetic demo)', 'scheduled'),
  ('70000000-0000-4000-8000-000000000002', '40000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', current_date + 1, '11:30', 'Video', 'General consultation (synthetic demo)', 'scheduled'),
  ('70000000-0000-4000-8000-000000000003', '40000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000001', current_date + 2, '15:00', 'In-person', 'Follow-up (synthetic demo)', 'scheduled')
on conflict (id) do update set patient_id = excluded.patient_id, doctor_id = excluded.doctor_id, appointment_date = excluded.appointment_date, appointment_time = excluded.appointment_time, appointment_type = excluded.appointment_type, reason = excluded.reason, status = excluded.status;

insert into public.ai_interactions (id, user_id, patient_id, agent_type, agent_name, input_text, output_text, metadata, created_at) values
  ('80000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001', 'assistant', 'medical_assistant', 'Summarize synthetic wellness visit', 'Synthetic summary prepared for demonstration.', '{"demo":true,"source":"seed"}'::jsonb, now() - interval '45 minutes'),
  ('80000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000002', 'risk', 'risk_monitor', 'Review synthetic screening context', 'Synthetic demo output; no real clinical decision was made.', '{"demo":true,"source":"seed"}'::jsonb, now() - interval '2 hours'),
  ('80000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000003', 'records', 'medical_records_agent', 'Prepare synthetic follow-up context', 'Synthetic context generated for dashboard testing.', '{"demo":true,"source":"seed"}'::jsonb, now() - interval '1 day')
on conflict (id) do update set user_id = excluded.user_id, patient_id = excluded.patient_id, agent_type = excluded.agent_type, agent_name = excluded.agent_name, input_text = excluded.input_text, output_text = excluded.output_text, metadata = excluded.metadata, created_at = excluded.created_at;

insert into public.ai_flags (id, patient_id, doctor_id, severity, message, status, created_at) values
  ('90000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000001', 'low', 'Demo flag: follow-up review requested.', 'open', now() - interval '1 hour'),
  ('90000000-0000-4000-8000-000000000002', '40000000-0000-4000-8000-000000000003', '30000000-0000-4000-8000-000000000001', 'medium', 'Demo flag: verify follow-up appointment.', 'reviewed', now() - interval '1 day')
on conflict (id) do update set patient_id = excluded.patient_id, doctor_id = excluded.doctor_id, severity = excluded.severity, message = excluded.message, status = excluded.status, created_at = excluded.created_at;

insert into public.automation_logs (id, workflow_name, trigger_type, status, reference_id, details) values
  ('a0000000-0000-4000-8000-000000000001', 'appointment_reminder_demo', 'schedule', 'success', 'demo-appointment-reminder', '{"demo":true,"message":"Synthetic reminder workflow log"}'::jsonb),
  ('a0000000-0000-4000-8000-000000000002', 'ai_flag_review_demo', 'database_event', 'success', 'demo-ai-flag-review', '{"demo":true,"message":"Synthetic review workflow log"}'::jsonb)
on conflict (id) do update set workflow_name = excluded.workflow_name, trigger_type = excluded.trigger_type, status = excluded.status, reference_id = excluded.reference_id, details = excluded.details;

commit;
