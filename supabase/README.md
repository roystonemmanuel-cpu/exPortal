# Database Setup — OECS Examination Portal

## Prerequisites

- [Supabase CLI](https://supabase.com/docs/guides/cli) `>= 1.200`
- Docker (for local dev)
- A Supabase project (for remote deployment)

---

## Local development

```bash
# 1. Start local Supabase stack (Postgres + Auth + Storage + Studio)
supabase start

# 2. Apply migrations and seed data
supabase db reset

# 3. Open Studio (table editor, SQL, etc.)
open http://localhost:54323
```

`supabase db reset` runs all files in `migrations/` in filename order, then
runs `seed/seed.sql`. It wipes and recreates the local database each time.

### Local credentials for .env

After `supabase start`, copy the printed `API URL` and `anon key` into your
`.env` file:

```
VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_ANON_KEY=<anon key from supabase start output>
```

---

## Creating the seed auth users (local)

The seed SQL references two fixed UUIDs for the admin and invigilator. You
must create matching auth users before running the seed, or the profile
INSERT will fail (foreign key on auth.users).

Run this once after `supabase start`:

```sql
-- In Supabase Studio → SQL Editor
INSERT INTO auth.users (
  id, email, encrypted_password, email_confirmed_at,
  raw_user_meta_data, created_at, updated_at, role, aud
)
VALUES
(
  'a1b2c3d4-0002-0002-0002-000000000002',
  'admin@roseauprimary.edu.dm',
  crypt('ChangeMe123!', gen_salt('bf')),
  now(),
  '{"role":"admin","school_id":"a1b2c3d4-0001-0001-0001-000000000001","full_name":"Ms. Carla Benjamin"}',
  now(), now(), 'authenticated', 'authenticated'
),
(
  'a1b2c3d4-0003-0003-0003-000000000003',
  'darius@roseauprimary.edu.dm',
  crypt('ChangeMe123!', gen_salt('bf')),
  now(),
  '{"role":"invigilator","school_id":"a1b2c3d4-0001-0001-0001-000000000001","full_name":"Mr. Darius Joseph"}',
  now(), now(), 'authenticated', 'authenticated'
);
```

Then run `supabase db reset` (or just `psql $DB_URL < seed/seed.sql`).

### Dev login credentials

| Role | Email | Password |
|---|---|---|
| Admin | `admin@roseauprimary.edu.dm` | `ChangeMe123!` |
| Invigilator | `darius@roseauprimary.edu.dm` | `ChangeMe123!` |

### Dev student PINs

Session code: `a1b2c3d4-0040-0001-0001-000000000001`

| Student | PIN |
|---|---|
| Amara Charles | `100001` |
| Jovani Baptiste | `100002` |
| Kessia Joseph | `100003` |
| Marcus Thomas | `100004` |
| Reia Austrie | `100005` |

---

## Remote deployment (Supabase cloud)

```bash
# Link to your cloud project
supabase link --project-ref <your-project-ref>

# Push migrations (does NOT run seed — run seed manually for production)
supabase db push

# To apply seed on a fresh cloud project (one time):
psql "$DATABASE_URL" < supabase/seed/seed.sql
```

### After deploying migrations

1. **Enable Realtime** on the `student_sessions` table in the Supabase dashboard
   (Table Editor → student_sessions → Realtime toggle).

2. **Create the Storage bucket**
   Dashboard → Storage → New bucket → Name: `exam-assets` → Private.
   Then add the two storage policies documented at the bottom of `migrations/20260317000002_rls.sql`.

3. **Set environment variables** in your hosting provider (Vercel, Netlify, etc.):
   ```
   VITE_SUPABASE_URL=https://<your-project>.supabase.co
   VITE_SUPABASE_ANON_KEY=<your-anon-key>
   ```

---

## Migration file index

| File | Contents |
|---|---|
| `20260317000001_schema.sql` | All tables, types, indexes, triggers |
| `20260317000002_rls.sql` | Row Level Security — all policies + helper functions |

---

## RLS at a glance

| Table | Student (PIN) | Invigilator | School Admin | Admin |
|---|---|---|---|---|
| schools | ✗ | Read own | Read + Update own | Read + Update own |
| profiles | ✗ | Read school | Read school + Update | Full |
| questions | ✗ | Read school | Full | Full |
| stimuli | ✗ | Read school | Full | Full |
| exams | ✗ | Read school | Full | Full |
| sessions | ✗ | Read + Update own | Full | Full |
| student_sessions | ✗ | Read + Update own session | Full | Full |
| responses | ✗ (synced via staff JWT) | Upsert + Read school | Full | Full |
| incidents | ✗ | Insert + Read own session | Full | Full |

**Students never authenticate with Supabase Auth.** Their responses are
synced to Supabase by the invigilator's authenticated client (or by the
student's device using the invigilator's JWT stored in the PWA) once
connectivity is restored. The `responses_upsert` RLS policy checks that the
`student_session_id` belongs to the authenticated user's school — not to the
student directly.
