# OECS Primary Examination Portal — Project Brief

> Read this file before writing any code. It is the authoritative specification for this project.

---

## What this application is

A child-centred, offline-resilient examination delivery and conducting portal for primary education across seven OECS member states (Saint Lucia, Grenada, Dominica, Saint Vincent and the Grenadines, Saint Kitts and Nevis, Antigua and Barbuda, British Virgin Islands). It serves learners in Grades K–6 (ages 5–12), invigilators conducting examinations, and school/national administrators managing results.

This is not a learning management system. It is a purpose-built assessment platform with three distinct user-facing interfaces and a shared backend.

---

## Three user roles

| Role | Primary concern | Key screens |
|---|---|---|
| **Student** | Answer questions calmly and clearly | PIN login → welcome → exam delivery → review → submit |
| **Invigilator** | Monitor the sitting, maintain control | Session setup → live classroom monitor → incident log → collect |
| **Admin** | Manage items, schedule exams, analyse results | Item bank → exam builder → scheduler → analytics dashboard → results release |

---

## Design principles (non-negotiable)

1. **Child-first calm** — No countdown timers visible to students. No red alerts. No bureaucratic chrome. The student interface must feel safe and encouraging.
2. **Offline-first** — The exam package (questions, images, audio) downloads at session start. All responses write to IndexedDB locally on every interaction. Sync happens in the background when connectivity is available. A student must never see a loading spinner mid-question.
3. **One question per screen** — For all grade levels. Scroll-free. Each screen is a single decision point.
4. **Caribbean context** — Word problems use local names, currencies (EC$), fruits, and geography. Science questions reference endemic Caribbean species. Geography uses OECS islands and regional maps.
5. **Touch-native** — Minimum tap target size 44px. All interactions must work on tablets without a mouse. Keyboard navigation must also be fully supported for accessibility.
6. **WCAG 2.1 AA** — High contrast, scalable text (minimum 16px body), screen reader support, keyboard navigation throughout.

---

## Technology stack

### Frontend
- **React 19** with functional components and hooks throughout — no class components
- **Vite 7** as build tool and dev server
- **TailwindCSS** for utility styling — use Tailwind classes, not inline styles or CSS modules except where Tailwind cannot reach
- **Dexie.js** for IndexedDB — all local response storage goes through Dexie
- **Workbox** (via vite-plugin-pwa) for Service Worker and offline caching
- **Framer Motion** for transitions — keep animations under 200ms, use `ease-out`, never animate during question answering itself
- **React Router v7** for navigation
- **TanStack Query v5** for all server state — no raw fetch calls in components
- **Zustand** for client state (exam session state, current question index, flag set)

### Backend
- **Supabase** for authentication, real-time subscriptions (invigilator dashboard), and PostgreSQL database
- **Supabase Row Level Security** enforces school-scoped data access — every query must be scoped to the authenticated user's school_id
- **Supabase Storage** for question images and audio assets
- **Node.js / Express** for the EMIS integration API layer (separate service)

### Testing
- **Vitest** for unit tests
- **Playwright** for end-to-end tests

---

## Folder structure

```
src/
  components/
    student/          # All student-facing UI components
    invigilator/      # Invigilator control panel components
    admin/            # Admin dashboard components
    shared/           # Shared components (buttons, badges, progress dots, etc.)
  pages/
    student/          # Student route pages
    invigilator/      # Invigilator route pages
    admin/            # Admin route pages
  hooks/              # Custom React hooks (useExamSession, useOfflineSync, useInvigilator)
  store/              # Zustand stores (examStore, sessionStore)
  lib/
    db.js             # Dexie database schema and instance
    supabase.js       # Supabase client initialisation
    sync.js           # Offline sync logic
    markScheme.js     # Auto-marking engine
  types/              # JSDoc type definitions (no TypeScript — use JSDoc)
  utils/              # Pure utility functions
public/
  icons/              # PWA icons
```

---

## Question type taxonomy

| Type | Tier | Auto-marked | Notes |
|---|---|---|---|
| Multiple choice (4 options) | 1 | Yes | Default question type |
| True / False | 1 | Yes | Simplified UI for K–2 |
| Fill in the blank | 1 | Yes | Normalised string comparison |
| Drag and order | 2 | Yes | Touch-native drag, keyboard alternative |
| Image label (tap to assign) | 2 | Yes | Labels placed on image regions |
| Audio question | 2 | Yes | Play button triggers audio, replay allowed |
| Short answer | 3 | No | Text input max 200 chars, routed to marking queue |
| Drawing / sketch | Future | No | Canvas input, tablet only |

### Stimulus blocks (question roots)
A stimulus block is a shared content root (text, image, audio, or combination) that multiple question items inherit from. The data model must distinguish between a stimulus root object and its child question items.

**Layout rules for stimulus blocks:**
- Landscape / split: stimulus left panel (50%), questions right panel (50%)
- Portrait / stacked: stimulus in sticky scrollable panel above questions, max-height 220px
- The stimulus must remain visible while the student navigates between child questions
- Hotspot markers on stimulus images must pulse/highlight when the active question references that region

---

## Offline architecture

### IndexedDB schema (Dexie)

```javascript
// lib/db.js
const db = new Dexie('OECSExamPortal');
db.version(1).stores({
  examPackages: 'id, sessionId, downloadedAt',
  responses: '++id, sessionId, questionId, updatedAt, synced',
  sessions: 'id, studentPin, schoolId, status',
  flags: '++id, sessionId, questionId',
});
```

### Sync strategy
1. On session start: download full exam package (questions + assets) to IndexedDB and cache via Service Worker
2. On every response: write to `responses` table immediately, `synced: false`
3. Background sync: Workbox Background Sync API queues POST requests; on reconnection, flush unsynced responses to Supabase
4. Conflict resolution: last-write-wins per questionId within a sessionId
5. On submit: mark session `status: 'submitted'` locally, attempt immediate sync, queue if offline

---

## Authentication

- **Students**: PIN-based (4–6 digits). No email, no password. Invigilator unlocks the session; student enters PIN to claim their seat. PIN is scoped to a session — it expires when the session closes.
- **Invigilators**: Email + password via Supabase Auth. Role: `invigilator`.
- **Admins**: Email + password via Supabase Auth. Role: `admin` or `school_admin`.
- **No account creation in the app** — accounts are provisioned by national admins out of band.

---

## Data model (key tables)

```sql
-- Schools
schools (id, name, country_code, emis_id)

-- Users
profiles (id, role, school_id, full_name)

-- Item bank
questions (id, type, stem_text, stem_image_url, stem_audio_url, choices, correct_answer, mark_scheme, subject, grade_level, version, retired_at)
stimuli (id, title, content_text, image_url, audio_url, created_at)
stimulus_questions (stimulus_id, question_id, order)

-- Examinations
exams (id, title, subject, grade_level, school_id, scheduled_at, duration_minutes, status)
exam_questions (exam_id, question_id, order)

-- Sittings
sessions (id, exam_id, school_id, invigilator_id, status, started_at, ended_at)
student_sessions (id, session_id, student_pin, student_name, emis_student_id, submitted_at)

-- Responses
responses (id, student_session_id, question_id, response_value, marked_correct, marks_awarded, synced_at)
```

---

## Design system

### Colour palette
```css
--oecs-teal: #1D9E75;       /* Primary action, answered state */
--oecs-teal-light: #E1F5EE; /* Selected background */
--oecs-amber: #BA7517;      /* Flagged state, warnings */
--oecs-amber-light: #FAEEDA;
--oecs-navy: #185FA5;       /* Admin accents, info */
--oecs-navy-light: #E6F1FB;
--oecs-coral: #D85A30;      /* Errors, alerts */
--oecs-coral-light: #FAECE7;
--oecs-neutral-100: #F1EFE8;
--oecs-neutral-400: #888780;
--oecs-neutral-800: #2C2C2A;
```

### Typography
- Body: minimum 16px, line-height 1.6
- Question stem: 15–16px, font-weight 500
- Answer choices: 14px
- Labels / badges: 11–12px, font-weight 500
- No font sizes below 11px anywhere

### Component conventions
- Minimum tap target: 44px height and width
- Border radius: 8px (small components), 12px (cards), 20px (pills)
- Selected state: teal border + teal-light background
- Flagged state: amber border + amber-light background
- Progress dots: answered = teal, current = teal wide pill, flagged = amber, unanswered = neutral border
- No countdown timers in the student interface
- No red error states in the student interface (use amber for attention)

---

## Localisation

The interface must support language switching between:
- English (default)
- Kwéyòl / Antillean Creole (Saint Lucia, Dominica)
- French Creole (Saint Vincent)

Use `react-i18next` for all UI strings. No hardcoded English strings in components — every user-facing string goes through the `t()` function.

---

## EMIS integration

The OECS regional EMIS provides the student roster. The exam portal pulls student records via a REST API using the `emis_student_id` as the canonical learner identifier. Results are posted back to EMIS on release. The EMIS integration runs server-side in the Express API layer — it never touches the client directly.

---

## Build sequence (follow this order)

1. **Project scaffold** — Vite + React + Tailwind + Router + Dexie + Supabase client + PWA plugin
2. **Student exam screen** — Single question display, MCQ interaction, progress dots, flag, next/prev navigation
3. **Stimulus block layout** — Shared image/text root with child question navigator, split and stacked layouts
4. **Offline layer** — Dexie schema, response write on every interaction, sync queue
5. **PIN login flow** — Student PIN entry screen, session claim
6. **Question type components** — True/False, Fill-in-blank, Drag-and-order, Image label, Audio player, Short answer
7. **Invigilator panel** — Session setup, live classroom monitor (Supabase real-time), pause/extend/collect controls
8. **Admin item bank** — Question CRUD, stimulus builder, image/audio upload to Supabase Storage
9. **Admin exam builder** — Assemble questions into exams, schedule sittings
10. **Marking queue** — Short answer marking interface for invigilators
11. **Analytics dashboard** — Results by school, grade, subject, gender
12. **Results release** — Admin-controlled release gate, PDF export

Build one numbered step at a time. Do not move to the next step until the current step has passing Vitest unit tests for its core logic and renders correctly in the browser.

---

## Critical constraints

- **Never fetch question assets on demand during a sitting** — everything must be in the offline cache before the session starts
- **Never store sensitive data in localStorage** — use IndexedDB via Dexie only
- **Row Level Security is mandatory** — every Supabase table must have RLS enabled; no table is publicly readable
- **No TypeScript** — use JSDoc annotations for type documentation
- **No class components** — functional components and hooks only
- **No hardcoded strings** — all user-facing text through react-i18next
- **Images must have alt text** — no decorative images without `aria-hidden="true"`

---

## Key files to create first

When scaffolding, create these files before any component code:

- `CLAUDE.md` — this file, in project root
- `src/lib/db.js` — Dexie schema
- `src/lib/supabase.js` — Supabase client
- `src/store/examStore.js` — Zustand exam session store
- `src/store/sessionStore.js` — Zustand auth/session store
- `vite.config.js` — with PWA plugin configured
- `.env.example` — with all required environment variables documented

---

*This brief was produced as part of the OECS Skills and Innovation Project (SKIP), Component 1.1 — EMIS and Virtual Campus. World Bank Grant E286/P179210.*
