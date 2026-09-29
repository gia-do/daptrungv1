# Supabase setup

1. Create a Supabase project.
2. Open **SQL Editor**.
3. Run `migrations/001_dat_trung.sql`.
4. Copy the project URL and publishable/anon key into `config.js`.
5. Set `USE_SUPABASE: true` only after the client repository layer is wired.

Do not put a `service_role` key in `config.js` or any GitHub file.

The schema is deliberately small: rooms, players, games, game_players and turn_records.
The frontend remains the game engine; Supabase is the shared-state/realtime layer.
