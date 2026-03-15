# Helma - Project Context for Gemini

## Project Overview

Helma is a custom paint-by-numbers and glitter reveal storefront application tailored for the Tunisian market. The project features a dual-stack architecture:
- **Frontend:** A React 18 SPA built with Vite and TypeScript, styled with Tailwind CSS and `shadcn/ui` components. It handles user-facing workflows such as kit customization, AI-assisted creative generation, and order tracking. It integrates with Supabase for data persistence and authentication.
- **Backend (`/backend`):** A Python FastAPI service dedicated to heavy image processing tasks (stencil generation, glitter reveal pipelines). It utilizes libraries like `opencv-python-headless`, `Pillow`, `rembg`, and `scikit-image`.
- **Supabase (`/supabase`):** Manages database migrations and serverless edge functions to handle workflows like order creation, email notifications (via Resend), and OpenAI integrations.

## Architecture & Technologies

### Frontend
- **Framework:** React 18, Vite, TypeScript
- **Styling:** Tailwind CSS, PostCSS, Radix UI (`shadcn/ui`)
- **State/Data Fetching:** React Hook Form, TanStack React Query (assumed based on standard patterns, check package.json), Supabase JS Client
- **Testing:** Vitest, Testing Library

### Backend Image Processing
- **Framework:** Python 3.11+, FastAPI, Uvicorn
- **Image Processing:** OpenCV, Pillow, scikit-image, rembg
- **Testing:** Pytest

### Infrastructure
- **BaaS:** Supabase (Postgres, Storage, Auth, Edge Functions)

## Building and Running

### Frontend Commands (Root Directory)
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Run unit tests
npm test

# Run linter
npm run lint
```

**Frontend Environment Variables:**
Requires `.env` file with `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_REVEAL_API_URL` (to link with the Python backend), and various other keys (OpenAI, Resend) for Edge Functions.

### Backend Commands (`/backend` Directory)
```bash
# Install dependencies (including dev)
pip install -e ".[dev]"

# Start development server
uvicorn app.main:app --reload --port 8000

# Run tests
pytest

# Docker
docker-compose up
```

## Development Conventions
- **Frontend Code Structure:** Typical Vite+React structure with components (`src/components`), hooks (`src/hooks`), pages (`src/pages`), and utility libraries (`src/lib`).
- **Testing:** The project utilizes Vitest and Testing Library for frontend testing (`.test.ts` files in `src/lib/` and `src/pages/`) and Pytest for backend testing (`backend/tests/`). Maintain coverage when modifying utility functions or pipelines.
- **Supabase Functions:** Logic requiring secure server execution (e.g., API keys for OpenAI/Resend) or direct database admin access resides in Supabase Edge Functions. Use the Supabase CLI for deploying these.
- **Graceful Degradation:** The frontend is designed to fall back to client-side image processing if the FastAPI backend (`VITE_REVEAL_API_URL`) is unreachable.
