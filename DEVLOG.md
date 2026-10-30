# Development log

## 2026-10-30

- Added the first real Meta Model API integration through the OpenAI-compatible
  client, including caching, per-project call limits, JSON retry handling, and
  health status.
- Added `/api/designs/analyze` with structured clarification questions and
  ready design specifications.
- Added frontend question chips and a specification card; 3D generation remains
  intentionally disabled until the CAD phase.
- Verified a real Meta API call and a real ambiguous ESP32 request returning
  clarification questions.
- Added the component library schema, atomic JSON storage, fuzzy matching,
  component endpoints, and a searchable frontend library panel.
- Added one explicitly unverified ESP32 example record with a manufacturer
  source link; no component is treated as verified yet.
- Cleaned the frontend architecture and removed the local keyword/regex "AI" inference.
- Added an honest disconnected state until the Meta Model API analysis endpoint exists.
- Split the FastAPI models, routes, and preview service.
- Added the first backend health test.
- Still missing: verified component records, deterministic CAD generation,
  verification, and persistence.
