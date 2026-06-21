# AGENTS.md

## Things that have broken before

- Local API startup crashed with `EMFILE: too many open files, watch` -> `node --watch` watched too much in this workspace -> keep the bootstrap dev script on plain `node src/index.js`.
- Local API startup exited after the listen line -> this sandbox blocks binding `0.0.0.0` -> bind `127.0.0.1` locally and use `0.0.0.0` only on Render.
- Render manual deploy trigger returned an empty accepted response -> the poller assumed JSON and crashed -> poll deploy status even when the trigger response body is empty.
- Admin survey detail showed `Invalid ID format` for friendly URLs -> stale ID-style routes were still being served from `dist` -> use explicit `/surveys/by-url/:friendlyUrl` routes and rebuild/restart the API after route changes.
- Admin survey rows had no edit/status actions -> admins had to open detail pages with no way to change the survey -> keep edit and active/inactive controls available from the survey table.
- Admin submissions view showed autosaved draft submissions -> survey submissions API returned every status -> filter survey submissions to `SUBMITTED` on the server.
