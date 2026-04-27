# Smart Assistant for Moms (MVP v1.3)

Mobile MVP scaffold with:
- English UI
- Mother / Child / Staff roles
- Optional staff access
- Child parental approval request flow
- Staff task priority colors: Urgent (red), Non-urgent (yellow), Done (green)
- Calendar filters (`My Only` / `All`)
- Child activities with frequency per week
- Shopping list workflow

## 1) Prerequisites

- Node.js 20+
- npm 10+
- Expo Go app (for device testing)

## 2) Setup

```bash
cd smart-mom-app
cp .env.example .env
# put your real EXPO_PUBLIC_SUPABASE_ANON_KEY value
npm install
npm run start
```

## 3) Supabase Setup

1. Open your Supabase project SQL Editor.
2. Run [`supabase/schema.sql`](./supabase/schema.sql).
3. In Supabase, enable `Authentication -> Providers -> Email`.
4. In Authentication settings, disable email confirmation for local testing (optional, recommended).
5. Put these variables into `.env`:

```env
EXPO_PUBLIC_SUPABASE_URL=https://ebsrwsjpgnhsgygzhuxm.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=YOUR_PUBLISHABLE_KEY
```

## 4) MVP Behavior Included

- Task priorities and colors:
  - `Urgent` -> red
  - `Non-urgent` -> yellow
  - `Done` -> green
- Live Tasks now support:
  - Email sign-up / sign-in
  - Auto-creation of a family space (`ensure_user_family()`)
  - Create task (Mother)
  - Update task status
  - Child delete request flow + Mother approval/decline
- Child cannot hard-delete tasks directly; creates approval request.
- Mother can approve/decline request.
- Staff role can be disabled from Settings.
- Child profile supports `Activities / Sports / Clubs` + `Times per Week`.

## 5) Next Step (recommended)

Replace mock data (`src/data/mock.ts`) with real Supabase queries in screens and app state.
