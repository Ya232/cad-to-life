# CAD-to-Life

CAD-to-Life is an AI-assisted parametric design workspace for electronic and
mechanical parts. A user describes a project, imports a component datasheet or
sketch, and receives a verifiable design ready for 3D printing.

The MVP covers several reusable part families:

- enclosures
- brackets and supports
- mounting plates
- spacers

Planned capabilities include datasheet dimension extraction, component
libraries with manufacturer sources, STL export, printable-design checks,
saved project history, and French/English interfaces.

Everything in this repository was written during the Meta Global AI Developer
Hackathon (Oct 26-Nov 4, 2026).

## Development

The project uses a Next.js frontend and a FastAPI backend.

```text
frontend/  Web interface
backend/   API and parametric design domain
```

The first vertical slice is intentionally dependency-light: it creates a
project, previews a parametric part specification, and stores project history
in the API process. Persistent storage, CAD generation, and Meta model
integration will be added next.

## Meta Model API key

The key must stay in the backend environment and must never be placed in
frontend code or committed to Git.

```powershell
cd "C:\Users\HP 3PRO\cad-to-life\backend"
Copy-Item .env.example .env
notepad .env
```

Replace `replace_with_your_meta_model_api_key` with the key from the Meta Model
API dashboard. The backend exposes only its configuration status at
`http://localhost:8000/api/meta/status`; it never returns the key.

If port 8000 is blocked on your machine, run the backend on a free port instead:

```powershell
cd "C:\Users\HP 3PRO\cad-to-life\backend"
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8001 --reload
```

The frontend automatically tries `localhost:8000` and `localhost:8001` before failing.
