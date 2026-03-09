# Helma

Helma is a Vite + React + TypeScript storefront for custom paint-by-numbers kits in Tunisia. Customers can create an order, generate AI-assisted variants for supported categories, track delivery, and manage post-purchase flows from a lightweight Supabase backend.

## Stack

- React 18 + TypeScript
- Vite
- Tailwind CSS + shadcn/ui
- Supabase (Auth, Postgres, Storage, Edge Functions)
- Vitest + Testing Library

## Local Development

```sh
npm install
npm run dev
```

Other useful commands:

```sh
npm run build
npm run preview
npm run lint
npm test
```

The app expects environment variables for Supabase and the production integrations used by edge functions:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY`
- `OPENAI_IMAGE_MODEL` (optional)
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- `HELMA_SITE_URL`
- `HELMA_SUPPORT_EMAIL`

## Supabase

Database migrations live in `supabase/migrations/`. Public and admin workflows depend on these edge functions:

- `create-order`
- `track-order`
- `generate-creative`
- `send-order-email`
- `regeneration-request`

Deploy functions and migrations with the Supabase CLI before promoting changes to production.
