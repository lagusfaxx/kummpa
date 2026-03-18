# Kummpa — Pet Super-App

## Project Overview
Monorepo: Next.js 14 frontend (`apps/web`) + Express/TypeScript API (`apps/api`).

## Tech Stack
- **Frontend**: Next.js 14, TypeScript, Tailwind CSS, Radix UI (port 5000)
- **Backend**: Express, Prisma ORM, PostgreSQL (port 3000)
- **Auth**: JWT (access + refresh tokens), stored in httpOnly cookies + localStorage
- **DB**: PostgreSQL via Prisma, 12+ migrations applied

## Key Features
- Map of pet-related places (vets, caregivers, shops)
- Digital vaccination cards
- NFC pet ID
- Community profiles and forums
- Marketplace with store dashboard
- Lost pet alerts
- Benefits/discounts
- News

## Architecture

### API Proxy
Next.js rewrites `/api/v1/*` → `http://localhost:3000/api/v1/*` in `apps/web/next.config.js`.
`NEXT_PUBLIC_API_URL=""` for relative URLs.

### Auth
- JWT secrets: `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` (env vars)
- Demo user: `demo@kummpa.cl` / `Demo1234!`

### Brand
- Primary: dark green `hsl(164 30% 18%)`
- Accent: orange `hsl(22 92% 60%)`
- Name: "Kummpa" (double m, double p)

## Main Pages
| Route | Description |
|-------|-------------|
| `/` | Home hub with hero, shortcuts, features |
| `/account` | 3-tab account hub (Perfil, Reservas, Configuración) |
| `/marketplace` | Marketplace listings browser |
| `/marketplace/dashboard` | Professional store dashboard (10 sections) |
| `/benefits` | Benefits/discounts page |
| `/explore` | Service explorer |
| `/map` | Interactive map |
| `/pets` | Pet management |
| `/community` | Community hub |
| `/alerts` | Lost pet alerts |

## Store Dashboard (`/marketplace/dashboard`)
Professional 10-section panel:
- **Resumen**: Stats overview (active products, favorites, etc.)
- **Tienda**: Shop profile editor (connected to ShopProfile API)
- **Productos**: Product management table with create/toggle/delete (real API)
- **Categorías**: Category distribution with progress bars
- **Inventario**: Stock status per listing (real data)
- **Promociones**: UI scaffolding for promotions system
- **Pagos**: Payment methods toggle (local state)
- **Envíos**: Shipping methods toggle (local state)
- **Pedidos**: Orders view (scaffolded, ready for backend)
- **Configuración**: General settings + data overview

Layout: Sticky sidebar on desktop, pill tabs on mobile, hamburger drawer overlay.

## Account Hub (`/account`)
3-tab panel:
- **Perfil**: Avatar upload, editable fields (name, phone, city, bio), connected to API
- **Reservas**: Appointment list with status badges, empty state
- **Configuración**: Account info, notification prefs, logout

## Key Files
- `apps/web/src/app/account/page.tsx` — Account hub
- `apps/web/src/app/marketplace/page.tsx` — Marketplace browser
- `apps/web/src/app/marketplace/dashboard/page.tsx` — Store dashboard
- `apps/web/src/app/benefits/page.tsx` — Benefits page
- `apps/web/src/components/home/home-hub.tsx` — Home page
- `apps/web/next.config.js` — API proxy config
- `apps/api/src/config/env.ts` — API env config
- `prisma/schema.prisma` — Database schema

## Optional Env Vars (app works without them)
- `MAPBOX_ACCESS_TOKEN` — for map features
- `RESEND_API_KEY` — for email notifications

## Deployment
- Start API: `npm run start:api` (runs `prisma migrate deploy` first)
- Start web: `npm run start:web`
- Coolify config uses these scripts
