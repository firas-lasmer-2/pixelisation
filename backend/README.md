# Helma Reveal Backend

Python FastAPI service for stencil paint & glitter reveal image processing.

## Quick Start

```bash
# Install dependencies
pip install -e ".[dev]"

# Run dev server
uvicorn app.main:app --reload --port 8000

# Run tests
pytest

# Docker
docker-compose up
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/health/ready` | Readiness check |
| POST | `/api/reveal/generate` | Full pipeline — returns job_id |
| GET | `/api/reveal/{job_id}` | Job status + assets + manifest |
| POST | `/api/reveal/preview` | Lightweight preview (stages 1-7) |
| POST | `/api/reveal/debug` | Debug intermediate layers |

## Environment Variables

See `.env.example` for all options.

## Frontend Integration

Set `VITE_REVEAL_API_URL=http://localhost:8000` in the frontend `.env` to enable backend processing.
The frontend will fall back to client-side processing when the backend is unreachable.
