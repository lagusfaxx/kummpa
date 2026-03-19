# Kummpa — Pet Super-App

## Project Overview
Monorepo: Next.js 14 frontend (`apps/web`) + Express/TypeScript API (`apps/api`).

## Tech Stack
- **Frontend**: Next.js 14, TypeScript, Tailwind CSS, Radix UI (port 5000)
- **Backend**: Express, Prisma ORM, PostgreSQL (port 3000)
- **Auth**: JWT (access + refresh tokens), stored in httpOnly cookies + localStorage
- **DB**: PostgreSQL via Prisma, 12+ migrations applied

## Key Features
- Map of pet-related places (vets, caregivers, shops, groomers)
- Digital vaccination cards
- NFC pet ID
- Community profiles and forums
- Marketplace with store dashboard
- Lost pet alerts
- Benefits/discounts
- News
- Groomer dashboard (peluquería management)

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
| `/marketplace` | P2P listings grid with CommercialNav, category filters, search |
| `/marketplace/[id]` | Individual listing detail with photo gallery, seller info, chat CTA |
| `/marketplace/tiendas` | Shop directory grid with search |
| `/marketplace/tiendas/[id]` | Individual shop profile + product grid |
| `/marketplace/publicar` | Listing creation form |
| `/marketplace/chats` | Two-column chat UI (conversations + messages) |
| `/marketplace/guardados` | Saved/favorited listings grid |
| `/marketplace/dashboard` | Professional store dashboard (10 sections, SHOP role only) |
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

## Vet Dashboard (`/business`)
Professional 5-section panel for VET role users:
- **Resumen**: Stats overview (pending/confirmed appointments, today's count) + upcoming reservations
- **Perfil**: Clinic profile editor (name, address, phone, email, emergency 24/7 toggle)
- **Servicios**: Appointment services CRUD with price/duration/type (PUT to `/provider/services`)
- **Horarios**: Weekly availability schedule (PUT to `/provider/availability`)
- **Reservas**: Appointment management with confirm/reject actions, status filters

SHOP role → redirects to `/marketplace/dashboard`. CAREGIVER role → WalkerPanel placeholder. GROOMING role → redirects to `/groomer`.

## Groomer Dashboard (`/groomer`)
Professional 5-tab panel for GROOMING role users:
- **Resumen**: Stats overview (pending/confirmed today, upcoming appointments)
- **Mi perfil**: Business profile editor (name, address, phone, email, bio, coords, avatar)
- **Servicios**: Grooming-specific services CRUD (BATH, HAIRCUT, NAIL_TRIM, etc.)
- **Horarios**: Weekly availability schedule
- **Reservas**: Appointment management with confirm/reject, status filters

DB: `GroomerProfile` model linked to `User` (role=GROOMING). API: `/api/v1/groomers` (GET list, GET /me, PUT /me, GET /:id). Map integration loads groomers as GROOMING-type map points.

## Public Business Pages
- `/explore/vet/[id]` — Public vet clinic profile: header, services, opening hours, booking form
  - Booking uses `createAppointment()` with `providerSourceId = sourceId from MapServicePoint`
  - Booking form shows login CTA if not authenticated
- `/explore/shop/[id]` — Public shop profile: header, discounts, product catalog + cart
  - Products from `listMarketplaceListings()` (requires auth; shows empty state if guest)
  - Local cart state with qty controls and checkout placeholder

## Explore CTAs (type-aware)
- `type === "SHOP"` → "Ver tienda" button (orange) → `/explore/shop/[sourceId]`
- `type === "VET"` → "Reservar" button (primary green) → `/explore/vet/[sourceId]`
- Other types → "Reservar" using existing `bookingUrl` or `profileUrl`

## Commercial Hub Navigation
`CommercialNav` component (`apps/web/src/components/commercial/commercial-nav.tsx`) renders 5 tabs:
Marketplace → Tiendas → Publicar → Chats → Guardados
Active tab resolved by `usePathname()`. Not shown on `/marketplace/dashboard`.

## Key Files
- `apps/web/src/app/account/page.tsx` — Account hub
- `apps/web/src/app/business/page.tsx` — VET/Caregiver dashboard
- `apps/web/src/app/explore/page.tsx` — Explore/map page with type-aware CTAs
- `apps/web/src/app/explore/vet/[id]/page.tsx` — Public vet profile + booking
- `apps/web/src/app/explore/shop/[id]/page.tsx` — Public shop profile + cart
- `apps/web/src/app/marketplace/page.tsx` — Marketplace P2P listings grid
- `apps/web/src/app/marketplace/[id]/page.tsx` — Listing detail
- `apps/web/src/app/marketplace/tiendas/page.tsx` — Shop directory
- `apps/web/src/app/marketplace/tiendas/[id]/page.tsx` — Shop profile + products
- `apps/web/src/app/marketplace/publicar/page.tsx` — Create listing
- `apps/web/src/app/marketplace/chats/page.tsx` — Messaging
- `apps/web/src/app/marketplace/guardados/page.tsx` — Saved listings
- `apps/web/src/app/marketplace/dashboard/page.tsx` — Store dashboard (SHOP only)
- `apps/web/src/components/commercial/commercial-nav.tsx` — Marketplace sub-nav
- `apps/web/src/features/shops/shops-api.ts` — Public shop directory API client
- `apps/web/src/app/benefits/page.tsx` — Benefits page
- `apps/web/src/components/home/home-hub.tsx` — Home page
- `apps/web/next.config.js` — API proxy config
- `apps/api/src/config/env.ts` — API env config
- `apps/api/src/modules/profiles/profiles.service.ts` — listPublicShops + getPublicShopByUserId
- `apps/api/src/modules/profiles/profiles.router.ts` — GET /api/v1/profiles/shops, /shops/:userId
- `prisma/schema.prisma` — Database schema

## Optional Env Vars (app works without them)
- `MAPBOX_ACCESS_TOKEN` — for map features
- `RESEND_API_KEY` — for email notifications

## Deployment
- Start API: `npm run start:api` (runs `prisma migrate deploy` first)
- Start web: `npm run start:web`
- Coolify config uses these scripts
