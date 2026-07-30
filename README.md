# TrainSpotter

Aplikacja do tworzenia przez użytkowników spisu pojawień taboru kolejowego na stacjach i przystankach — z systemem oceny poprawności zgłoszeń oraz predykcją miejsc, w których dany typ taboru najprawdopodobniej się pojawi.

> **Status**: projekt świeżo zbootstrapowany. Kod to na razie niezmodyfikowany starter (Astro + Supabase auth) — funkcje domenowe (typy taboru, stacje, zgłoszenia, oceny, predykcje) nie są jeszcze zaimplementowane. Zobacz [`context/foundation/prd.md`](./context/foundation/prd.md) po pełny zakres MVP.

## Tech Stack

- [Astro](https://astro.build/) v6 — server-first meta-framework (SSR)
- [React](https://react.dev/) v19 — interaktywne "wyspy" UI
- [TypeScript](https://www.typescriptlang.org/) v5
- [Tailwind CSS](https://tailwindcss.com/) v4 + shadcn/ui
- [Supabase](https://supabase.com/) — Postgres + Auth
- [Cloudflare Workers](https://workers.cloudflare.com/) — deployment

## Prerequisites

- Node.js v22.14.0 (patrz `.nvmrc`)
- npm
- Docker (do lokalnego Supabase)

## Getting Started

1. Zainstaluj zależności:

   ```bash
   npm install
   ```

2. Skonfiguruj Supabase — patrz [Supabase Configuration](#supabase-configuration) poniżej.

3. Utwórz `.dev.vars` dla lokalnych sekretów Cloudflare:

   ```bash
   cp .env.example .dev.vars
   ```

4. Uruchom serwer deweloperski:

   ```bash
   npm run dev
   ```

## Available Scripts

- `npm run dev` — serwer deweloperski (runtime Cloudflare `workerd`)
- `npm run build` — build produkcyjny
- `npm run preview` — podgląd builda produkcyjnego
- `npm run lint` / `npm run lint:fix` — ESLint (reguły type-checked)
- `npm run format` — Prettier

## Project Structure

```
.
├── context/            # PRD, tech-stack hand-off, bootstrap verification log
├── src/
│   ├── layouts/         # Astro layouts
│   ├── pages/           # Astro pages
│   │   └── api/         # API endpoints
│   ├── components/      # Komponenty UI (Astro i React)
│   └── lib/             # Klient Supabase, helpery
├── public/              # Statyczne assety
├── supabase/            # Konfiguracja lokalnego Supabase
└── wrangler.jsonc       # Konfiguracja Cloudflare Workers
```

## Supabase Configuration

Zmienne środowiskowe są deklarowane przez schemat `astro:env` i traktowane jako sekrety **wyłącznie serwerowe** — nigdy nie trafiają do klienta.

### Lokalnie (bez chmury)

Wymaga [Dockera](https://www.docker.com/) i ~7 GB RAM.

```bash
cp .env.example .env
npx supabase init
npx supabase start
```

CLI wypisze dane logowania — wklej je do `.env` i `.dev.vars`:

```
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_KEY=<anon key z outputu CLI>
```

Zatrzymanie stacka: `npx supabase stop`. Lokalne Studio UI: `http://localhost:54323`.

### Z chmurą Supabase

| Zmienna        | Opis                                                         |
| -------------- | ------------------------------------------------------------- |
| `SUPABASE_URL` | URL projektu z Supabase dashboard → Settings → API           |
| `SUPABASE_KEY` | Klucz publiczny `anon` z Supabase dashboard → Settings → API  |

### Auth routes

| Route                 | Opis                                                                |
| --------------------- | ---------------------------------------------------------------------- |
| `/auth/signin`        | Formularz logowania e-mail/hasło                                       |
| `/auth/signup`        | Formularz rejestracji                                                  |
| `/auth/confirm-email` | Strona "sprawdź skrzynkę" po rejestracji                               |
| `/dashboard`           | Przykładowa chroniona strona (przekierowuje do `/auth/signin` bez sesji) |

Ochrona tras jest obsługiwana w `src/middleware.ts` (tablica `PROTECTED_ROUTES`).

## Deployment

```bash
npm run build
npx wrangler deploy
```

Sekrety `SUPABASE_URL` i `SUPABASE_KEY` ustaw w dashboardzie Cloudflare lub przez `npx wrangler secret put`.

## CI

GitHub Actions uruchamia lint + build na każdym push i PR do `main`.

## Project Docs

- [`context/foundation/prd.md`](./context/foundation/prd.md) — pełny PRD
- [`context/foundation/tech-stack.md`](./context/foundation/tech-stack.md) — uzasadnienie wyboru stacku
- [`context/changes/bootstrap-verification/verification.md`](./context/changes/bootstrap-verification/verification.md) — log audytu scaffoldu (w tym `npm audit`)

## Licencja

[MIT](./LICENSE)
