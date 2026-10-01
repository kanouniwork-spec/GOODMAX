# GOODMAX website

Next.js 15 (App Router) + TypeScript site for GOODMAX with a scroll-controlled product video intro, EN/FR/AR (RTL) and a full admin panel.

## Run locally

```bash
npm install
cp .env.example .env.local      # set ADMIN_BOOTSTRAP_PASSWORD at least
npm run dev                     # http://localhost:3000
```

Admin: http://localhost:3000/admin, sign in as `admin@goodmax.local` with `ADMIN_BOOTSTRAP_PASSWORD`
(if left empty, a random password is written to `.data/initial-admin.txt` on first run).

Other scripts: `npm run build`, `npm start`, `npm run lint`, `npm run typecheck`, `npm run media` (re-encode the source video), `npm run seed:supabase`.

## Data backends

All reads and writes go through one interface (`lib/data/types.ts`), so the storage can be swapped without touching pages or admin screens.

| Backend | When | Where data lives |
|---|---|---|
| `file` (default) | local dev / preview | `.data/db.json` + `.data/uploads/` |
| `supabase` | production | Postgres tables, Supabase Auth, Storage bucket `media` |

`DATA_BACKEND` picks one; when empty, Supabase is used automatically if its three env vars are set.
The file backend is not suitable for Vercel (the filesystem there is temporary; the admin shows a warning if that happens).

## Going live (what is needed)

1. **Supabase project**: the Project URL, anon key and service-role key (Settings → API).
2. In the Supabase SQL editor run `supabase/migrations/0001_init.sql` (tables, row-level security, `media` bucket).
3. Put the keys in `.env.local` and run `npm run seed:supabase` once. It loads the starter content and creates the first admin user (`ADMIN_BOOTSTRAP_EMAIL` / `ADMIN_BOOTSTRAP_PASSWORD`).
4. **GitHub repository**: push this folder (the `.gitignore` already excludes `.data`, `.env*`, `node_modules`).
5. **Vercel**: import the repo, set env vars `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_MEDIA_BUCKET=media`, `NEXT_PUBLIC_SITE_URL=https://your-domain`, optionally `ANTHROPIC_API_KEY` for one-click translation drafts.

## Structure

- `app/(site)` public pages: `/`, `/about`, `/brands`, `/products`, `/distributors`, `/locations`, `/contact`
- `app/admin` login + panel: dashboard, page builder, brands, products, distributor requests & contact inbox, media library, social links, locations & wilayas, users & roles, settings, appearance, SEO, marketing pixels, translations, publishing center
- `components/sections` section renderers incl. `VideoStory.tsx` (the scroll video)
- `lib/data` storage layer, `lib/auth` sessions/roles, `lib/i18n` languages, `lib/content` draft/publish logic
- `data/seed.ts` starter content, `data/wilayas.ts` wilaya list
- `supabase/migrations` database schema

## Content rules built in

- Every editable item has a draft and a published version; visitors only see published content. Publish per language from the editor or all at once from the Publishing center. Signed-in users can preview drafts.
- Placeholder content is flagged in the admin (orange "placeholder" badge) and listed on the dashboard under "Still needed from GOODMAX".
- Missing translations fall back to English.
- Wilayas 59–69 exist as blank, inactive rows until official names are entered.

## Scroll video

`components/sections/VideoStory.tsx`: sticky full-screen video whose time follows scroll position (smoothed with requestAnimationFrame), logo intro, four callout stages with editable timing (from/to % of the video) and position, progress bar and 01/04 counter. Mobile gets a 720p file; browsers without H.264 get the WebM file; reduced-motion users see a still image with the callouts listed. The video files were encoded with a keyframe every 4 frames so scrubbing stays smooth (`scripts/prepare-media.sh`).
