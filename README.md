# CAD-to-Life

CAD-to-Life is an AI-assisted workspace for turning a plain-language electronics
or mechanical project into a grounded, parametric, 3D-printable part. The
planned workflow is: understand the request, ground component dimensions in
manufacturer datasheets, generate deterministic geometry, verify it, and
deliver an STL with a certificate.

## Status

| Implemented | In progress | Planned |
| --- | --- | --- |
| Next.js chat workspace | Deterministic CAD and STL export | Datasheet import |
| FastAPI health, preview, in-memory project, analysis, and component endpoints | Component library with explicit source metadata | Deterministic CAD and STL export |
| FR/EN shell and collapsible history | Analysis clarification flow | Verification loop and certificate |
| Basic dimension warnings and fuzzy component matching |  | SQLite persistence and datasheet import |

The current application does not claim to generate CAD or verify printability.
Those capabilities will only be exposed after they are implemented and tested.
Design analysis returns either clarification questions or a structured
specification from the Meta Model API.

## Architecture

```text
frontend/  Next.js interface and chat workspace
backend/   FastAPI API, Pydantic models, and design services
```

The frontend calls the backend over HTTP. The Meta API key belongs only in the
backend environment and is never sent to the browser.

## Run locally

Backend:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

Frontend:

```powershell
cd frontend
npm install
npm run dev
```

If port 8000 is unavailable, run the backend on port 8001. The frontend tries
both ports automatically.

## Environment variables

Copy `backend/.env.example` to `backend/.env` and set:

- `META_MODEL_API_KEY`
- `META_MODEL_API_BASE_URL`
- `META_MODEL_NAME` (defaults to `muse-spark-1.1`)
- `META_MAX_CALLS_PER_PROJECT` (defaults to `12`)
- `ALLOWED_ORIGINS` (optional, comma-separated)

Never commit `backend/.env`.

## Libraries

- Python: FastAPI, Uvicorn, Pydantic, python-dotenv, OpenAI, rapidfuzz
- Frontend: Next.js, React, TypeScript

## Meta models

The analysis endpoint uses the OpenAI-compatible Meta Model API with a
configurable Muse Spark model:

```text
POST /api/designs/analyze
```

To make one real request for key validation:

```powershell
cd backend
.\.venv\Scripts\python.exe -m scripts.smoke_meta
```

## Known limitations

- The seed component record is explicitly unverified and must be replaced or
  confirmed against the exact manufacturer drawing before CAD generation.
- No CAD geometry, STL export, verification certificate, or persistent database
  exists yet.
- Project history currently lives only in the API process.

## License

See [LICENSE](LICENSE).

Everything in this repository was written during the Meta Global AI Developer
Hackathon (Oct 26-Nov 4, 2026).
