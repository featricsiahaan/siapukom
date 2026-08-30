# Handoff: SiapUKOM — Frontend Prototype

## Overview
SiapUKOM is a competency-exam prep app for Indonesian health profession students (UKMPPD / uji kompetensi). This bundle covers the full learner-facing flow: marketing landing page, login, free practice mode, and a member dashboard.

## About the Design Files
The files in this bundle are **design references built as static/interactive HTML prototypes** — they show intended look, layout, and interaction behavior. They are **not production code to copy as-is**. The task is to **recreate these designs in the target codebase's environment** (React, Vue, Flutter, native, etc.) using its existing component library, state management, and API patterns — or, if no environment exists yet, choose the most suitable stack and implement there.

## Fidelity
**High-fidelity**: exact colors, typography, spacing, and copy are final for layout/visual purposes. All quiz questions, user names, scores, membership dates, and category evaluations are **dummy/placeholder data** — not final content, and not connected to any backend. Treat every number and string flagged "Prototipe" in-file as an example to be replaced by real data once the backend exists.

## Screens / Views

### 1. Landing (`SiapUKOM Landing.dc.html`)
Marketing page, own visual theme (navy/gold — deliberately distinct from the app's internal theme).
- **Nav bar**: logo "SiapUKOM" (navy "Siap" + gold "UKOM"), links Fitur/Harga, right-aligned "Masuk" (login) link + "Mulai Gratis" primary button → Latihan page.
- **Hero**: two-column grid, max-width 1280px, padding 88px/64px. Left: eyebrow pill, H1 (52px/800), body paragraph, two CTAs ("Mulai Latihan Gratis" primary → Latihan, "Lihat Demo" text link → anchor), trust line. Right: a browser-chrome-framed mock dashboard preview (static illustrative card, not the real dashboard).
- **Fitur section** (`#fitur`): 3-column card grid, icon (gold, in tinted rounded square) + title + description. Cards: "Bank Soal Terupdate", "Simulasi Mirip Asli", "Analitik Kesiapan".
- **Harga section** (`#harga`): 2-column pricing cards — "GRATIS" (Rp 0, outline CTA → Latihan) and "AKSES PENUH" (navy filled card, "Segera Hadir", gold CTA → main app).
- **Footer**: centered copyright line.
- Testimonial section was intentionally removed — do not re-add.

### 2. Masuk / Login (`SiapUKOM Masuk.dc.html`)
- Centered card, max-width 400px. Fields: Nama (text), Password (password), inline validation errors (red, `#C0392B`) if empty or password <4 chars.
- Submit button "Masuk" → on success shows a success banner, stores the name in `localStorage` (`siapukom_nama`), and redirects (900ms delay) to the main app.
- Secondary link to Latihan Gratis (no-account path) and a "not connected to a server" disclaimer.
- **This is the integration point for real auth** — replace client-only validation + localStorage with a real auth API call (see Backend Notes).

### 3. Latihan Gratis / Free Practice (`SiapUKOM Latihan.dc.html`)
Three-state single page (menu → session → result), state held in component state (not persisted).
- **Menu**: category pills (9: "Semua Kategori" + 8 clinical categories), question-count pills (5/10/20), "Mulai Latihan" button starts a shuffled session from a hardcoded 8-question bank (`makeBank()` in the logic script).
- **Session**: category badge, progress text + bar, question card (vignette + 5 lettered options as radio rows), instant feedback box on answer (correct = gold tint, wrong = grey strikethrough), Prev/Next navigation, "Lihat Hasil" on last question.
- **Result**: circular score gauge (SVG stroke-dasharray gauge), correct/total line, per-category score bars, "Coba Lagi" (reset) and "Daftar untuk Akses Penuh" → main app.
- **Backend integration point**: replace `makeBank()` with a real question bank fetch (filtered by category/count), and persist session results server-side instead of only in local component state.

### 4. Main App / Dashboard (`SiapUKOM.dc.html`)
Internal app theme currently reuses the same navy/gold palette as Landing (a prior iteration used a separate Broadsheet cyan/magenta serif system for the app shell — confirm with the team which is canonical before backend work, since the live file currently matches Landing's palette).
- **Top nav**: logo, Dashboard/Latihan/Simulasi links, user avatar (initial letter) + name, "Keluar" (logout, links to Masuk).
- **Greeting**: "Halo, {nama}" — name is read from `localStorage.siapukom_nama` (set at login), falling back to a `nama` prop/default.
- **Membership card** (navy, left column): plan name, expiry date, sessions-used/total progress bar, "Perpanjang / Tambah Sesi" CTA → Latihan.
- **Readiness score card** (right column): circular SVG gauge (0–100), color-coded label (green "Siap" ≥80, gold "Cukup" 60–79, red "Perlu Latihan" <60), short explanatory copy.
- **Category evaluation grid**: 3-column card grid, one card per topic category — score, level badge, progress bar. Currently 6 hardcoded categories (`categories` array in the logic class) — level thresholds and colors are computed client-side by `levelFor(score)`.
- Disclaimer line noting all dashboard data is dummy.

## Interactions & Behavior
- Navigation is plain `<a href>` links between the four files — no client-side router.
- Login → dashboard name handoff currently uses `localStorage.siapukom_nama` as a placeholder for a real session/auth token.
- No loading or error states are built for network calls (there are none yet) — add them when wiring real APIs (e.g., skeletons for dashboard cards, inline error banners for login/API failures).
- No responsive/mobile breakpoints — all four pages are desktop-first, fixed padding, no media queries.

## State Management
Needed once backend-connected (suggested shape, not prescriptive):
- **Auth/session**: current user id, name, auth token — replaces `localStorage.siapukom_nama`.
- **Membership**: plan name, expiry date, sessions used/total (drives membership card + gating on "Mulai Latihan").
- **Readiness**: overall score + per-category `{name, score}[]` — score-to-label/color mapping (`levelFor`) can stay client-side logic once fed real scores.
- **Question bank**: category list, per-category question pool, each question `{id, kategori, pertanyaan, opsi:[{letter,text}], kunci, pembahasan}`.
- **Practice session**: selected category/count, shuffled question set, current index, answers map, per-question revealed/feedback state — currently ephemeral (lost on refresh); consider persisting server-side so results feed the readiness score.
- **Session/result submission**: on finishing a practice run, POST answers so the backend can recompute readiness per category.

## Design Tokens
- **Colors**: navy `#0F2C59` (primary/text), gold accent `#C9962E` (links/icons) with a lighter gold `#E5BA73` (progress fills, badges, dark-card CTA) and a muted gold-brown `#8A6A2E` (badge text), background tints `#F6F8FC` / `#F8F9FC` / `#EEF1F6`/`#EEF1F7`, white `#FFFFFF` cards. Status colors: green `#2E8B57` (siap/ready), amber `#B8860B` (cukup), red `#C0392B`/`#C0392B` (perlu latihan / errors).
- **Typography**: Plus Jakarta Sans (400–800), loaded via Google Fonts. Scale in use: 52px/800 (H1 hero), 34px/800 (section H2), 26–28px/800 (page H1), 18–19px/800 (nav logo, H2), 14–17px/500–700 (body/buttons), 11–13px (labels/meta).
- **Spacing**: section padding 88px vertical / 64px horizontal (marketing sections); dashboard content padding 44px/24px; card padding 22–34px; gaps 8–32px depending on grouping.
- **Radius**: 8–10px (buttons/inputs), 12–14px (small cards), 16–18px (large cards/panels), 999px (pills/badges).
- **Shadows**: soft navy-tinted shadows, e.g. `0 8px 28px rgba(15,44,89,0.08)` (cards), `0 10px 24px rgba(15,44,89,0.22)` (primary buttons), `0 10px 28px rgba(15,44,89,0.18)` (dark membership card).

## Assets
- No raster images/icons — all icons are inline SVG (stroke-based, gold `#C9962E`), all gauges/progress bars are hand-built SVG/CSS (no chart library). No external image assets to migrate.
- Google Font: Plus Jakarta Sans (weights 400/500/600/700/800) — link exactly as loaded in each file's `<helmet>`, or self-host per the target project's font strategy.

## Files
- `SiapUKOM Landing.dc.html` — marketing landing page
- `SiapUKOM Masuk.dc.html` — login
- `SiapUKOM Latihan.dc.html` — free practice mode (menu/session/result)
- `SiapUKOM.dc.html` — member dashboard (main app shell)

Each file is a self-contained prototype (view source directly for exact markup/inline styles); the `<script type="text/x-dc" data-dc-script>` block in each file holds its interaction logic (state, handlers, computed display values) — read this alongside the markup to see exactly how each interaction behaves before reimplementing in the target framework.
