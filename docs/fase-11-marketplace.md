# Fase 11 - Marketplace pet

## Alcance implementado (Paso 17)

- modulo de marketplace para productos nuevos y usados
- categorias cubiertas:
- camas
- transportadoras
- juguetes
- correas
- jaulas
- ropa
- comederos
- accesorios
- otros
- crear publicacion con fotos, precio, estado, ubicacion, categoria y descripcion
- filtros de busqueda por:
- categoria
- nuevo/usado
- precio minimo y maximo
- comuna
- distancia (si se envia referencia geolocalizada)
- mas recientes
- favoritos por usuario
- chat comprador-vendedor por publicacion
- reporte de publicaciones
- destacar publicaciones por dias
- moderacion admin de reportes

## Cambios de base de datos

- Enum `MarketplaceCategory`
- Enum `MarketplaceReportStatus`
- campos nuevos en `MarketplaceListing`:
- `category`
- `photoUrls`
- `district`
- `latitude`
- `longitude`
- `featuredUntil`
- `deletedAt`
- modelos nuevos:
- `MarketplaceFavorite`
- `MarketplaceConversation`
- `MarketplaceMessage`
- `MarketplaceReport`

## API (apps/api)

Base: `/api/v1/marketplace`

- `GET /listings`
- `POST /listings`
- `GET /listings/:listingId`
- `PATCH /listings/:listingId`
- `DELETE /listings/:listingId`
- `POST /listings/:listingId/favorite`
- `DELETE /listings/:listingId/favorite`
- `POST /listings/:listingId/feature`
- `POST /listings/:listingId/conversations`
- `GET /conversations`
- `GET /conversations/:conversationId/messages`
- `POST /conversations/:conversationId/messages`
- `POST /reports`
- `GET /reports` (ADMIN)
- `PATCH /reports/:reportId` (ADMIN)

## Web (apps/web)

- `/marketplace` reemplaza placeholder con experiencia funcional:
- filtros de marketplace
- alta de publicacion
- listado y detalle de publicaciones
- favoritos
- inicio de chat y mensajeria
- reporte de publicaciones
- acciones de vendedor (activar/desactivar, eliminar, destacar)
- panel de moderacion para admin

## Migracion Prisma

- `prisma/migrations/20260317120000_phase11_marketplace/migration.sql`
- compatible con `npx prisma migrate deploy`
