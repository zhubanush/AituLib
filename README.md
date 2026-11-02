# AuraLib

Smart university library web app: a static site on GitHub Pages with a Supabase backend.

Live: https://zhubanush.github.io/AituLib/

## Features

- **Find a book**: search and filters, and a floor plan that shows the route to the shelf. Click an aisle to list its books. Every book has a QR code.
- **Self-checkout**: scan a book's QR code with the camera, or type its ID or call number, then borrow. Return, renew and see your reading history in **My account**.
- **Holds queue**: when a book comes back, the first reader in line gets a notification (in-app, plus a system alert if allowed).
- **Study rooms**: hourly bookings that update live for everyone. The database makes double bookings impossible.
- **Reviews and ratings**: only readers who borrowed a book can review it. Top books also ranks by rating.
- **Reading challenge**: a season every month, a reader leaderboard (nicknames only, opt-out in profile), a team leaderboard and 9 badges.
- **Book club**: the book of the week is chosen by last week's votes, with a discussion thread.
- **Profile**: semester reading goal, charts by month and genre, badges.
- **Smart planner** and **Insights**: room and book recommendations, and live library analytics.
- Light and dark theme, Russian / Kazakh / English, installable PWA (the catalog and map work offline).

## Structure

| Path | What |
|---|---|
| `index.html` | Markup and styles |
| `js/app.js` | Views and library rules |
| `js/store.js` | Supabase calls (auth, tables, RPC, realtime) |
| `js/i18n.js` | Interface text in EN / RU / KZ |
| `js/catalog.js` | Sample catalog (500 titles, simulated availability) |
| `js/config.js` | Supabase project URL and publishable key |
| `supabase/schema.sql` | Database: tables, row level security, server functions |
| `sw.js`, `manifest.webmanifest`, `icons/` | PWA |

## Setup (new Supabase project)

1. Create a project at supabase.com.
2. In **SQL Editor**, run `supabase/schema.sql`. It is safe to re-run after changes.
3. In **Authentication → Sign In / Providers → Email**, turn off **Confirm email** (or keep it on and set up SMTP).
4. In **Authentication → URL Configuration**, set **Site URL** to the Pages address.
5. Put the project URL and the publishable (anon) key into `js/config.js`. Never commit the secret / service_role key.

Run locally: `python -m http.server 8765`, then open http://localhost:8765.

After changing files that the service worker caches, bump `VERSION` in `sw.js`.
