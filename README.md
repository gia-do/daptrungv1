# 🥚 Đập Trứng

Mobile-first companion for a **physical board game**. Phones replace physical dice/cards/score board/buttons; the group is physically together.

## Architecture

- **GitHub Pages** — hosts the static frontend.
- **Vanilla HTML/CSS/JS** — no framework, no Node server.
- **Supabase** — shared room/game state + Realtime only.
- **No service/backend game server.**

```text
GitHub Pages
  ├── index.html
  ├── style.css
  ├── app.js
  ├── config.js
  └── assets/eggs/

Supabase
  └── rooms / players / games / game_players / turn_records
```

## Current state

This package is **GitHub-ready + Supabase-ready**. It includes:

- static GitHub Pages structure
- Supabase migration
- placeholder client configuration
- local two-player prototype flow
- the frozen egg-status mapping (`egg_0.png` … `egg_4.png`)
- no service-role secret in frontend

The current browser game shell is intentionally kept simple. The next implementation step is to replace the local repository functions with Supabase CRUD + Realtime subscriptions while keeping the same UI/game engine.

## GitHub Pages

1. Create a GitHub repository.
2. Upload the contents of this folder to the repository root.
3. GitHub → **Settings → Pages**.
4. Source: **Deploy from a branch**.
5. Select the main branch and `/ (root)`.
6. Open the generated Pages URL.

## Supabase

See `supabase/README.md` and run `supabase/migrations/001_dat_trung.sql` in Supabase SQL Editor.

Then edit `config.js`:

```js
window.DAT_TRUNG_CONFIG = {
  SUPABASE_URL: "https://YOUR_PROJECT.supabase.co",
  SUPABASE_ANON_KEY: "YOUR_PUBLISHABLE_OR_ANON_KEY",
  USE_SUPABASE: true
};
```

The publishable/anon key may exist in browser code when RLS is configured correctly. **Never put `service_role` in GitHub.**

## Egg assets

Add exactly five PNG files:

```text
egg_0.png  → HP > 5
egg_1.png  → 3 < HP <= 5
egg_2.png  → 1 < HP <= 3
egg_3.png  → HP = 1
egg_4.png  → HP <= 0
```

Egg HP is never clamped to zero.

## Frozen game principles

- physical board game first, digital second
- simple implementation
- 2–16 players
- host1 uses 4-letter room codes; host2 uses 4-digit room codes
- host is player #1
- random turn order is generated once per game and then fixed
- Miss + Critical generated rates <= 40%
- hidden 3× ceilings for Miss and Critical
- one button, two presses per turn
- beer is physically consumed and is not tracked as a resource
- eliminated players keep their real HP, including negative HP
- last remaining active player wins; their final turn still counts
- eliminated players are removed from future turns without reshuffling survivors
