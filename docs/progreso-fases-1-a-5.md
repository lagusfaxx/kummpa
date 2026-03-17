# Progreso Fases 1 a 5

Fecha de corte: 17-03-2026

## Estado ejecutivo

| Fase | Estado | Resultado |
| --- | --- | --- |
| Fase 1 - Fundaciones | Completada | Monorepo full-stack, Prisma/PostgreSQL, scripts y deploy base en Coolify listos |
| Fase 2 - Autenticacion | Completada | Auth con JWT + refresh rotativo, roles, verificacion email y reset password |
| Fase 3 - Perfiles y mascotas | Completada | Perfiles por rol + CRUD de mascotas con visibilidad publica y share token |
| Fase 4 - Carnet y recordatorios | Completada | Carnet digital, CRUD vacunas, vista imprimible, recordatorios email/in-app con deduplicacion |
| Fase 5 - Mapa con Mapbox | Completada | API y web con clustering, autocomplete, categorias completas, filtros avanzados y UX mobile/desktop |

## Fase 1 - Fundaciones del proyecto

### Implementado

- Monorepo con workspaces:
  - `apps/web` (Next.js 14 + TypeScript + Tailwind)
  - `apps/api` (Express + TypeScript)
  - `packages/ui`, `packages/types`, `packages/config`
- Prisma conectado a PostgreSQL en `prisma/schema.prisma`.
- Variables de entorno centralizadas en `.env.example`.
- Scripts reproducibles en raiz:
  - `dev`, `build`, `typecheck`, `lint`
  - `db:generate`, `db:migrate:dev`, `db:migrate:deploy`, `db:seed`
- Dockerfiles para despliegue separado de web y api:
  - `apps/web/Dockerfile`
  - `apps/api/Dockerfile`
- Guia de deploy en Coolify:
  - `docs/deploy-coolify.md`

### Entregables cumplidos

- Estructura inicial completa.
- Configuracion de build y ejecucion.
- Conexion Prisma operativa.
- Instrucciones de despliegue y variables documentadas.

## Fase 2 - Autenticacion y usuarios

### Backend (API)

- Auth JWT access/refresh con sesiones persistentes.
- Rotacion y revocacion de refresh token.
- Hash de password y validaciones.
- Verificacion de correo y recuperacion de password con tokens.
- Roles soportados: `OWNER`, `VET`, `CAREGIVER`, `SHOP`, `ADMIN`.
- Integracion Resend para emails transaccionales base.

### Endpoints Fase 2

- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/logout`
- `GET /api/v1/auth/me`
- `GET /api/v1/auth/admin/check`
- `POST /api/v1/auth/verify-email`
- `POST /api/v1/auth/verify-email/request`
- `POST /api/v1/auth/forgot-password`
- `POST /api/v1/auth/reset-password`

### Frontend (web)

- Pantallas:
  - `/login`
  - `/register`
  - `/forgot-password`
  - `/reset-password`
  - `/verify-email`
  - `/account` (protegida)

## Fase 3 - Perfiles de usuario y mascotas

### Backend (API + Prisma)

- Perfiles por rol con modelos dedicados:
  - `OwnerProfile`
  - `VetProfile`
  - `CaregiverProfile`
  - `ShopProfile`
- Mascotas con perfil completo:
  - modelo `Pet` y galeria `PetMedia`
  - visibilidad `isPublic`
  - `shareToken` para enlace publico
- CRUD de mascotas y perfil publico por token.

### Endpoints Fase 3

- Perfiles:
  - `GET /api/v1/profiles/me`
  - `PATCH /api/v1/profiles/me`
  - `PUT /api/v1/profiles/me/owner`
  - `PUT /api/v1/profiles/me/vet`
  - `PUT /api/v1/profiles/me/caregiver`
  - `PUT /api/v1/profiles/me/shop`
- Mascotas:
  - `GET /api/v1/pets`
  - `POST /api/v1/pets`
  - `GET /api/v1/pets/:id`
  - `PATCH /api/v1/pets/:id`
  - `PATCH /api/v1/pets/:id/visibility`
  - `DELETE /api/v1/pets/:id`
  - `GET /api/v1/pets/public/:shareToken`

### Frontend (web)

- Pantallas:
  - `/account`
  - `/pets`
  - `/pets/new`
  - `/pets/[id]`
  - `/pets/[id]/edit`
  - `/pets/public/[shareToken]`

## Fase 4 - Carnet de vacunacion virtual

### Backend (API + Prisma)

- Modelo `VaccineRecord` operativo con historial por mascota.
- Nuevos modelos para recordatorios/notificaciones:
  - `Reminder`
  - `ReminderDispatchLog`
  - `Notification`
- Estados del carnet por vacuna y resumen sanitario.
- Recordatorios programables por mascota:
  - envio por email (Resend)
  - notificacion in-app
  - preparacion para canal push (registro/logica)
- Deduplicacion de dispatch y log historico de envio.

### Endpoints Fase 4

- Carnet y vacunas:
  - `GET /api/v1/pets/:id/vaccine-card`
  - `GET /api/v1/pets/public/:shareToken/vaccine-card`
  - `GET /api/v1/pets/:id/vaccines`
  - `POST /api/v1/pets/:id/vaccines`
  - `PATCH /api/v1/pets/:id/vaccines/:vaccineId`
  - `DELETE /api/v1/pets/:id/vaccines/:vaccineId`
- Recordatorios:
  - `GET /api/v1/pets/:id/reminders`
  - `POST /api/v1/pets/:id/reminders`
  - `PATCH /api/v1/pets/:id/reminders/:reminderId`
  - `DELETE /api/v1/pets/:id/reminders/:reminderId`
  - `POST /api/v1/reminders/dispatch/due` (ADMIN)
  - `GET /api/v1/reminders/notifications/me`
  - `PATCH /api/v1/reminders/notifications/:notificationId/read`

### Frontend (web)

- Pantallas:
  - `/pets/[id]/vaccines`
  - `/pets/[id]/vaccines/print?format=sheet|card`
  - `/pets/public/[shareToken]/vaccine-card`
- Funcionalidad:
  - CRUD vacunas
  - filtros por tipo/fecha/estado
  - recordatorios manuales
  - compartir link publico
  - impresion/PDF desde navegador

### Variables nuevas de Fase 4

- `VACCINE_DUE_SOON_DAYS`
- `REMINDER_DISPATCH_BATCH_LIMIT`

## Fase 5 - Mapa con Mapbox (estado actual)

### Avance existente

- Variables de entorno usadas:
  - `MAPBOX_ACCESS_TOKEN`
  - `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN`
- Endpoints API implementados:
  - `GET /api/v1/map/services`
  - `GET /api/v1/map/suggestions`
  - `GET /api/v1/map/types`
  - filtros: `q`, `service`, `city`, `district`, `types`, `openNow`, `emergencyOnly`, `withDiscount`, `atHomeOnly`, `featuredOnly`, `includeLostPets`, `minRating`, `priceMin/priceMax`, `lat/lng/radiusKm`, `sortBy`, `limit`
- Servicio de mapa implementado en `apps/api/src/modules/map/map.service.ts`:
  - agrega veterinarias/clinicas 24-7, cuidadores, tiendas, peluquerias, hoteles, parques y alertas de mascotas perdidas
  - calcula distancia por Haversine
  - ordena por relevancia, distancia, recencia y rating
  - devuelve metadatos por categoria
- Pantalla web `/map` implementada en `apps/web/src/app/map/page.tsx`:
  - mapa client-only (sin romper SSR) con clustering
  - panel de filtros + listado en desktop
  - mapa full width + bottom sheet de resultados en mobile
  - geolocalizacion del usuario
  - autocomplete por zona/direccion/servicio
  - fichas con botones reservar/ver perfil/contactar
  - markers seleccionables y ajuste automatico de bounds
- Componente de mapa dedicado:
  - `apps/web/src/components/map/map-canvas.tsx`
- Perfil de `CAREGIVER` y `SHOP` extendido con coordenadas opcionales para puntos en mapa.

### Cierre de fase

- Requisitos tecnicos cubiertos: client-only, SSR-safe, coordenadas `[lng, lat]`, componentes reutilizables, clustering y performance movil.
- Requisitos funcionales cubiertos: categorias completas del mapa, filtros requeridos, buscador con autocomplete, boton de ubicacion y UX desktop/mobile definida.

## Validacion tecnica ejecutada

Ultima validacion completa ejecutada el 17-03-2026:

1. `npm run db:generate` -> OK
2. `prisma validate --schema prisma/schema.prisma` -> OK (con variables de entorno de DB)
3. `npm run lint` -> OK
4. `npm run typecheck` -> OK
5. `npm run build` -> OK

## Conclusion

- Fases 1, 2, 3 y 4 estan implementadas y validadas con build exitoso.
- Fase 5 queda completada y validada con build exitoso.
