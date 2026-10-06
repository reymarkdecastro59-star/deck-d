# Landing assets

The current landing uses `covers/` and `terrain/`.

- `terrain/` — four optimized 2K CC0 Poly Haven rock maps; source and processing
  details are in `terrain/README.md`.

- `covers/` — 9 game cover WebP images fetched from RAWG via
  `web/scripts/fetch-covers.mjs`. Regenerate with `npm run fetch:covers`.
  The manifest at `covers/covers.json` drives GameLibrary + DashboardShell.

Historical assets (hero character, plates, timeline rune) were retired in P9
of the landing redesign. Git history preserves them if you ever need to
revive one.
