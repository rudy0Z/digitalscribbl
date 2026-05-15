-- ============================================================
-- Scribbl — Seed Data
-- Run this after 001_schema.sql and 002_rls.sql.
-- Edit to match your university's structure.
-- ============================================================

-- Example: Single university with two academic groups
insert into academic_groups (id, name) values
  ('11111111-1111-1111-1111-111111111111', 'Engineering'),
  ('22222222-2222-2222-2222-222222222222', 'Management')
on conflict do nothing;

insert into programs (id, academic_group_id, name) values
  ('aaaa0001-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'Computer Science'),
  ('aaaa0002-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'Electronics'),
  ('aaaa0003-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'Mechanical'),
  ('bbbb0001-0000-0000-0000-000000000000', '22222222-2222-2222-2222-222222222222', 'MBA'),
  ('bbbb0002-0000-0000-0000-000000000000', '22222222-2222-2222-2222-222222222222', 'BBA')
on conflict do nothing;

insert into batches (program_id, graduation_year, label) values
  ('aaaa0001-0000-0000-0000-000000000000', 2025, '2025 Batch'),
  ('aaaa0001-0000-0000-0000-000000000000', 2026, '2026 Batch'),
  ('aaaa0002-0000-0000-0000-000000000000', 2025, '2025 Batch'),
  ('aaaa0003-0000-0000-0000-000000000000', 2025, '2025 Batch'),
  ('bbbb0001-0000-0000-0000-000000000000', 2025, '2025 Batch'),
  ('bbbb0002-0000-0000-0000-000000000000', 2025, '2025 Batch')
on conflict do nothing;

-- After seeding, set the first admin manually:
-- UPDATE users SET is_admin = true WHERE email = 'your-email@yourcollege.edu';
