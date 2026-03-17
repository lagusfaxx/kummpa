# Kumpa Platform

Base de Fase 1 + Fase 2 + Fase 3 + Fase 4 + Fase 5 + Fase 6 + Fase 7 + Fase 8 + Fase 9 + Fase 10 + Fase 11 + Fase 12 + Fase 13 + Fase 14 + Fase 15 + Fase 16 + Fase 17 + Fase 18 para una plataforma integral de mascotas, full-stack, escalable y lista para produccion.

## Stack

- `apps/web`: Next.js 14 (App Router) + TypeScript + Tailwind CSS
- `apps/api`: Node.js + Express + TypeScript
- `prisma`: Prisma ORM + PostgreSQL
- `packages/ui`: componentes compartidos UI
- `packages/types`: tipos compartidos
- `packages/config`: constantes compartidas

## Estructura

```txt
/apps
  /web
  /api
/packages
  /ui
  /config
  /types
/prisma
  schema.prisma
  seed.ts
```

## Requisitos

- Node.js 22+
- npm 11+
- PostgreSQL 16+

## Inicio rapido (desarrollo local)

1. Copiar variables:

```bash
cp .env.example .env
```

2. Instalar dependencias:

```bash
npm install
```

3. Generar cliente Prisma y migrar:

```bash
npm run db:generate
npm run db:migrate:dev -- --name init
```

4. Levantar web + api:

```bash
npm run dev
```

Web: `http://localhost:3000`  
API Healthcheck: `http://localhost:4000/health`

## Scripts raiz

- `npm run dev`: inicia web y api en paralelo (Turbo)
- `npm run build`: build de todos los workspaces
- `npm run typecheck`: chequeo estricto de TypeScript
- `npm run lint`: lint de workspaces
- `npm run db:generate`: genera Prisma Client
- `npm run db:migrate:dev`: crea/aplica migraciones en desarrollo
- `npm run db:migrate:deploy`: aplica migraciones en produccion
- `npm run db:seed`: ejecuta seed inicial

## Variables de entorno

Todas las variables requeridas estan en `.env.example`, incluyendo:

- Auth (`JWT_*`)
- Tokens de auth (`EMAIL_VERIFICATION_TOKEN_EXPIRES_IN`, `PASSWORD_RESET_TOKEN_EXPIRES_IN`)
- Carnet y recordatorios (`VACCINE_DUE_SOON_DAYS`, `REMINDER_DISPATCH_BATCH_LIMIT`)
- Reservas (`APPOINTMENT_DEFAULT_DURATION_MINUTES`, `APPOINTMENT_MIN_NOTICE_MINUTES`)
- Base de datos (`DATABASE_URL`, `SHADOW_DATABASE_URL`)
- Mapbox (`MAPBOX_ACCESS_TOKEN`, `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN`)
- Resend (`RESEND_API_KEY`, `EMAIL_FROM`)
- URL de web/api y CORS (`APP_BASE_URL`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_API_URL`, `CORS_ORIGIN`)

## Auth API (Fase 2)

Rutas implementadas en `api/v1/auth`:

- `POST /register`
- `POST /login`
- `POST /refresh`
- `POST /logout`
- `GET /me` (protegida)
- `GET /admin/check` (protegida por rol `ADMIN`)
- `POST /verify-email`
- `POST /verify-email/request`
- `POST /forgot-password`
- `POST /reset-password`

## Auth Web (Fase 2)

Pantallas implementadas:

- `/login`
- `/register`
- `/forgot-password`
- `/reset-password`
- `/verify-email`
- `/account` (privada)

## Perfiles y Mascotas API (Fase 3)

Rutas de perfiles (`api/v1/profiles`):

- `GET /me`
- `PATCH /me`
- `PUT /me/owner`
- `PUT /me/vet`
- `PUT /me/caregiver`
- `PUT /me/shop`

Rutas de mascotas (`api/v1/pets`):

- `GET /`
- `POST /`
- `GET /:id`
- `PATCH /:id`
- `PATCH /:id/visibility`
- `DELETE /:id`
- `GET /public/:shareToken`

## Perfiles y Mascotas Web (Fase 3)

- `/account` con editor de perfil base y perfil por rol
- `/pets`
- `/pets/new`
- `/pets/[id]`
- `/pets/[id]/edit`
- `/pets/public/[shareToken]`

## Vacunas y Recordatorios API (Fase 4)

Rutas de carnet/vacunas:

- `GET /api/v1/pets/:id/vaccine-card`
- `GET /api/v1/pets/public/:shareToken/vaccine-card`
- `GET /api/v1/pets/:id/vaccines`
- `POST /api/v1/pets/:id/vaccines`
- `PATCH /api/v1/pets/:id/vaccines/:vaccineId`
- `DELETE /api/v1/pets/:id/vaccines/:vaccineId`

Rutas de recordatorios:

- `GET /api/v1/pets/:id/reminders`
- `POST /api/v1/pets/:id/reminders`
- `PATCH /api/v1/pets/:id/reminders/:reminderId`
- `DELETE /api/v1/pets/:id/reminders/:reminderId`
- `POST /api/v1/reminders/dispatch/due` (ADMIN)
- `GET /api/v1/reminders/notifications/me`
- `PATCH /api/v1/reminders/notifications/:notificationId/read`

## Vacunas y Recordatorios Web (Fase 4)

- `/pets/[id]/vaccines` carnet digital completo
- `/pets/[id]/vaccines/print?format=sheet|card` vista imprimible / PDF desde navegador
- `/pets/public/[shareToken]/vaccine-card` carnet publico compartible

## Mapa API (Fase 5)

Rutas de mapa geolocalizado:

- `GET /api/v1/map/services`
- `GET /api/v1/map/suggestions`
- `GET /api/v1/map/types`

Filtros soportados en query:

- `q`, `service`, `city`, `district`
- `types=VET,CAREGIVER,SHOP,GROOMING,HOTEL,PARK,LOST_PET`
- `openNow`, `emergencyOnly`, `withDiscount`, `atHomeOnly`, `featuredOnly`, `includeLostPets`
- `minRating`, `priceMin`, `priceMax`
- `lat`, `lng`, `radiusKm`
- `sortBy=relevance|distance|recent|rating`
- `limit`

Datos incluidos en mapa:

- veterinarias y clinicas 24/7
- cuidadores
- pet shops
- peluquerias caninas
- hoteles/guarderias
- parques pet-friendly
- alertas activas de mascotas perdidas

## Mapa Web (Fase 5)

- `/map` mapa client-side con clustering de puntos y popups
- desktop: mapa + panel lateral de resultados
- mobile: mapa full width + bottom sheet de resultados
- autocomplete por direccion/zona/servicio
- filtros avanzados: tipo, abierto ahora, urgencias 24/7, descuentos, domicilio, destacados, rango precio, rating y cercania
- botones por ficha: reservar, ver perfil, contactar
- boton `Usar mi ubicacion` (HTML5 Geolocation)

## Reservas API (Fase 6)

Rutas de reservas (`/api/v1/appointments`):

- `GET /` listado de reservas (`view=owner|provider|all`, filtros por estado, fechas, mascota y proveedor)
- `POST /` crear reserva para una mascota propia
- `GET /:appointmentId` detalle de reserva
- `POST /:appointmentId/confirm`
- `POST /:appointmentId/reject`
- `POST /:appointmentId/cancel`
- `POST /:appointmentId/complete`
- `POST /:appointmentId/reschedule`

Rutas de agenda proveedor:

- `GET /provider/availability`
- `PUT /provider/availability`

Incluye:

- validacion de conflictos para evitar doble reserva por horario
- validacion de agenda de proveedor (si existe disponibilidad configurada)
- historial por owner y por proveedor
- estados: `PENDING`, `CONFIRMED`, `COMPLETED`, `CANCELLED`, `REJECTED`, `RESCHEDULED`
- emails transaccionales al crear, confirmar, cancelar/rechazar y reagendar

## Reservas Web (Fase 6)

- `/appointments`:
- formulario de creacion de reservas
- listado con acciones por estado y permisos
- vista de agenda proveedor
- editor de bloques de disponibilidad semanal
- `/appointments/[id]`: vista de detalle con acciones de estado

## Identidad Digital API (Fase 7)

Rutas en `api/v1/pets`:

- `GET /:id/identity`
- `PUT /:id/identity`
- `GET /public-identity/:publicToken`

Incluye:

- perfil publico de emergencia separado del perfil publico estandar
- estado de emergencia (`NORMAL`, `LOST`, `FOUND`, `IN_TREATMENT`)
- visibilidad configurable por campo
- token publico para QR/NFC

## Identidad Digital Web (Fase 7)

- `/pets/[id]/identity` panel de configuracion QR/NFC y privacidad
- `/pets/emergency/[publicToken]` perfil de emergencia publico
- acceso rapido desde `/pets/[id]` con boton `QR/NFC`

## Mascotas Perdidas API (Fase 8)

Rutas de alertas y avistamientos:

- `GET /api/v1/lost-pets/public/:shareToken`
- `GET /api/v1/lost-pets`
- `GET /api/v1/lost-pets/nearby`
- `POST /api/v1/lost-pets/report`
- `GET /api/v1/lost-pets/:alertId`
- `PATCH /api/v1/lost-pets/:alertId`
- `GET /api/v1/lost-pets/:alertId/sightings`
- `POST /api/v1/lost-pets/:alertId/sightings`

Incluye:

- alertas con estado `ACTIVE`, `FOUND`, `CLOSED`
- radio de busqueda configurable y bandera de difusion
- historial de avistamientos geolocalizados
- orden por cercania cuando se consulta con `lat/lng`
- feed dedicado de alertas cercanas via `GET /nearby`

## Mascotas Perdidas Web (Fase 8)

- `/lost-pets` listado con filtros + modo `cerca de mi`
- `/lost-pets/report` alta de alerta
- `/lost-pets/[id]` detalle, mapa de avistamientos y cierre de caso
- `/lost-pets/public/[shareToken]` vista publica compartible

## Comunidad Social API (Fase 9)

Rutas principales (`/api/v1/community`):

- `GET /feed`
- `POST /posts`
- `GET /posts/:postId`
- `DELETE /posts/:postId`
- `POST /posts/:postId/like`
- `DELETE /posts/:postId/like`
- `POST /posts/:postId/save`
- `DELETE /posts/:postId/save`
- `POST /posts/:postId/share`
- `POST /posts/:postId/comments`
- `DELETE /posts/:postId/comments/:commentId`
- `GET /profiles/me`
- `PATCH /profiles/me`
- `GET /profiles/:userId`
- `GET /profiles/:userId/posts`
- `POST /profiles/:userId/follow`
- `DELETE /profiles/:userId/follow`
- `GET /profiles/me/following`
- `GET /profiles/me/followers`
- `GET /pets/my`
- `GET /pets/:petId/profile`
- `PUT /pets/:petId/profile`
- `GET /walks/profile/me`
- `PATCH /walks/profile/me`
- `GET /walks/discover`
- `GET /walks/invitations`
- `POST /walks/invitations`
- `PATCH /walks/invitations/:invitationId`
- `GET /walks/invitations/:invitationId/chat`
- `POST /walks/invitations/:invitationId/chat`
- `GET /walks/events`
- `POST /walks/events`
- `POST /walks/events/:eventId/join`
- `DELETE /walks/events/:eventId/join`
- `POST /reports`
- `GET /reports` (ADMIN)
- `PATCH /reports/:reportId` (ADMIN)

Incluye:

- feed por modos (`discover`, `following`, `mine`, `saved`)
- visibilidad configurable de publicaciones (`PUBLIC`, `FOLLOWERS`, `PRIVATE`)
- perfiles sociales de usuario y de mascota
- interacciones: comentarios, likes, guardados y compartidos
- follow/unfollow y listados de seguidores/seguidos
- discovery de paseos por zona/filtros (especie, tamano, energia, edad)
- invitaciones a paseo con estados y chat previo
- eventos grupales pet con join/leave
- reportes con moderacion basica para admin

## Comunidad Social Web (Fase 9)

- `/community` feed social responsive con composer e interacciones
- `/community/users/[userId]` perfil social publico de usuario
- `/community/meet` discovery de paseos + invitaciones + chat + eventos grupales
- editor de perfil social propio dentro de `/community`
- configuracion de perfiles sociales de mascotas dentro de `/community`

## Foros API (Fase 10)

Rutas principales (`/api/v1/forum`):

- `GET /categories`
- `GET /topics`
- `POST /topics`
- `GET /topics/:topicId`
- `POST /topics/:topicId/replies`
- `PATCH /topics/:topicId/moderation` (ADMIN)
- `POST /replies/:replyId/useful`
- `DELETE /replies/:replyId/useful`
- `PATCH /replies/:replyId/moderation` (ADMIN)
- `POST /reports`
- `GET /reports` (ADMIN)
- `PATCH /reports/:reportId` (ADMIN)

Incluye:

- categorias iniciales del foro (salud, alimentacion, vacunas, entrenamiento, perros, gatos, mascotas exoticas, recomendaciones, experiencias, mascotas perdidas, adopcion)
- crear tema, responder y citar respuesta previa
- votar respuesta util (toggle)
- etiquetas por tema
- reportes por tema o respuesta
- moderacion basica admin (fijar, bloquear, ocultar tema y ocultar respuesta)
- busqueda de temas por texto, categoria o tag

## Foros Web (Fase 10)

- `/forum` reemplaza placeholder con experiencia completa:
- disclaimer visible de salud (no reemplaza atencion veterinaria profesional)
- buscador y filtros por categoria/tag
- creacion de temas
- detalle de tema con respuestas, cita y voto util
- reporte de temas/respuestas
- panel de moderacion para rol admin

## Marketplace API (Fase 11)

Rutas principales (`/api/v1/marketplace`):

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

Incluye:

- publicaciones de productos nuevos/usados por categoria
- filtros por categoria, estado, precio, comuna, distancia y recientes
- favoritos por usuario
- chat comprador-vendedor por publicacion
- reporte de publicaciones y moderacion admin
- destacado temporal de publicaciones

## Marketplace Web (Fase 11)

- `/marketplace` reemplaza placeholder con experiencia funcional:
- filtros de marketplace
- formulario de creacion de publicacion
- listado + detalle de publicaciones
- favoritos
- chat comprador-vendedor
- reporte y moderacion admin
- acciones de vendedor (activar/desactivar, eliminar, destacar)

## Beneficios API (Fase 12)

Rutas principales (`/api/v1/benefits`):

- `GET /`
- `GET /saved`
- `GET /redemptions/me`
- `GET /:benefitId`
- `POST /:benefitId/save`
- `DELETE /:benefitId/save`
- `POST /:benefitId/redeem`
- `POST /` (ADMIN)
- `PATCH /:benefitId` (ADMIN)

Incluye:

- listado de descuentos y convenios
- filtros por ciudad, comuna, tipo de proveedor y destacados
- guardado de beneficios por usuario
- activacion/canje de cupones
- historial de cupones/redenciones por usuario
- gestion admin de convenios

## Beneficios Web (Fase 12)

- `/benefits` reemplaza placeholder con experiencia funcional:
- filtros por zona y proveedor
- listado de beneficios destacados
- guardar/quitar guardado
- canjear cupon
- panel de mis cupones activos e historial
- formulario admin para alta de convenios

## Noticias API (Fase 13)

Rutas principales (`/api/v1/news`):

- `GET /categories`
- `GET /articles`
- `GET /articles/saved`
- `GET /articles/:articleId`
- `POST /articles/:articleId/save`
- `DELETE /articles/:articleId/save`
- `POST /articles/:articleId/share`
- `POST /articles` (ADMIN)
- `PATCH /articles/:articleId` (ADMIN)

Incluye:

- articulos por categoria (alimentos, gadgets, veterinaria, salud, eventos, alertas, adopcion)
- filtros por categoria, texto y destacados
- articulos destacados
- guardar/quitar guardado
- compartir con tracking por canal
- gestion admin para publicar y editar articulos

## Noticias Web (Fase 13)

- `/news` reemplaza placeholder con experiencia funcional:
- filtro por categoria, busqueda y destacados
- listado y detalle de articulos
- guardar noticias
- compartir noticia
- panel lateral de noticias guardadas
- formulario admin para crear articulos

## Emails Transaccionales con Resend (Fase 14)

Cobertura obligatoria implementada:

- verificacion de cuenta
- bienvenida
- recuperacion de contrasena
- reserva creada
- reserva confirmada
- reserva cancelada/rechazada
- reserva reagendada
- recordatorio de vacuna
- vacuna vencida
- alerta de mascota perdida activada
- avistamiento reportado

Mejoras tecnicas:

- plantillas unificadas con branding simple y textos claros
- reintentos automaticos de envio por Resend
- manejo de errores no bloqueante para flujos de negocio
- logs persistentes de envio en `EmailDispatchLog` (estado, intentos, error, metadata)

## Base de Datos PostgreSQL + Prisma (Fase 15)

Refuerzos de modelado implementados:

- `BusinessLocation` para normalizar ubicaciones operativas de `VetProfile`, `CaregiverProfile` y `ShopProfile`
- `AppointmentService` como catalogo formal de servicios por proveedor
- `PublicPetProfile` separado de la identidad de emergencia
- relaciones, indices y timestamps preparados para crecimiento

Integracion aplicada:

- sincronizacion automatica de `BusinessLocation` desde actualizaciones de perfiles
- mapa consume `BusinessLocation` con fallback a campos legacy
- reservas aceptan `appointmentServiceId` y exponen catalogo de servicios por proveedor
- mascotas publicas usan `PublicPetProfile` para visibilidad del perfil compartible
- UI web conectada para:
- `/appointments` con gestion de catalogo `AppointmentService`
- `/pets/[id]/public-profile` para editar `PublicPetProfile`
- nuevas rutas:
- `GET /api/v1/appointments/provider/services`
- `PUT /api/v1/appointments/provider/services`
- `GET /api/v1/pets/:id/public-profile`
- `PUT /api/v1/pets/:id/public-profile`

## Admin Panel (Fase 16)

Base nueva: `/api/v1/admin`

- `GET /summary`
- `GET /users`
- `PATCH /users/:userId`
- `GET /pets`
- `PATCH /pets/:petId`

Incluye:

- panel `/admin` solo para `ADMIN`
- metricas basicas de usuarios, mascotas, reservas, moderacion y contenido
- gestion de usuarios con verificacion y desactivacion/restauracion logica
- gestion de mascotas con filtros, visibilidad y archivado/restauracion
- revision de reservas usando `view=all` para administradores
- moderacion de comunidad y foro desde reportes abiertos
- revision de alertas de mascotas perdidas
- gestion rapida de beneficios y noticias

## UI/UX Responsive (Fase 17)

Base compartida nueva:

- `apps/web/src/features/ui/toast-context.tsx`
- `apps/web/src/components/feedback/skeleton.tsx`
- `apps/web/src/components/feedback/empty-state.tsx`
- `apps/web/src/components/feedback/inline-banner.tsx`
- `apps/web/src/app/loading.tsx`

Incluye:

- shell visual y navegacion mas app-like
- safe areas contempladas en header, shell, bottom nav y toasts
- estilos globales mas consistentes para formularios y superficies
- skeletons y empty states reutilizables
- toasts para acciones importantes
- mejora de UX en auth, perfil, mascotas, reservas, perfil publico y admin
- base mas solida para futura envoltura con Capacitor

## Migraciones Prisma

Se formalizaron las migraciones en `prisma/migrations` para usar deploy automatizado:

- `20260316190000_init_schema`
- `20260316231500_phase6_appointments`
- `20260316232000_phase7_pet_identity`
- `20260316233300_phase8_lost_pets`
- `20260316235200_phase9_community_social`
- `20260317004600_phase9_walks_meetups`
- `20260317013000_phase10_forum`
- `20260317120000_phase11_marketplace`
- `20260317133000_phase12_benefits`
- `20260317152000_phase13_news`
- `20260317173000_phase14_resend_emails`
- `20260317190000_phase15_schema_normalization`

Comando de despliegue:

- `npx prisma migrate deploy --schema prisma/schema.prisma`

Si una base ya existia sin historial Prisma, se puede alinear una sola vez con:

- `npx prisma migrate resolve --schema prisma/schema.prisma --applied <migration_name>`

## Deploy en Coolify

El detalle esta en [docs/deploy-coolify.md](./docs/deploy-coolify.md).

Resumen:

1. Conectar repositorio GitHub en Coolify.
2. Crear servicio PostgreSQL administrado.
3. Crear servicio `api` usando `apps/api/Dockerfile`.
4. Crear servicio `web` usando `apps/web/Dockerfile`.
5. Configurar variables de entorno.
6. Dejar `PRISMA_MIGRATE_ON_START=true` en `api` para migracion automatica.
7. Definir healthcheck `GET /health` para `api`.
8. Definir healthcheck `GET /api/health` para `web`.

## Estado Fase 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17 y 18

- Arquitectura monorepo lista para crecer por dominios.
- Frontend responsive base y rutas consistentes para los modulos del ecosistema pet.
- API modular con manejo de errores, validacion de entorno y healthcheck.
- Prisma conectado a PostgreSQL con schema inicial extensible.
- Autenticacion completa con roles, sesiones persistentes, refresh token rotativo y rutas privadas.
- Verificacion de correo, recuperacion de contrasena y envio de emails con Resend.
- Perfiles de usuario por rol implementados (owner, vet, caregiver, shop).
- CRUD completo de mascotas con visibilidad publica/privada y link compartible.
- Carnet de vacunacion digital con historial, filtros, estados y certificados.
- Motor de recordatorios con envio por email e in-app, historial de dispatch y deduplicacion.
- Vista imprimible preparada para generar PDF desde navegador.
- Mapa geolocalizado completo con clustering, autocomplete, filtros avanzados, categorias pet completas y UX desktop/mobile.
- Modulo de reservas completo con historial owner/proveedor, control de estados, agenda semanal y notificaciones por email.
- Identidad digital de mascota con perfil de emergencia publico, controles de privacidad y preparacion QR/NFC.
- Sistema de mascotas perdidas con alertas, avistamientos, estado de caso, geolocalizacion comunitaria y vista publica compartible.
- Comunidad social completa con feed, perfiles, interacciones, discovery de paseos, invitaciones con chat y eventos grupales.
- Foros comunitarios por categorias con temas, respuestas, citas, votos utiles, reportes y moderacion admin.
- Marketplace pet funcional con publicaciones, filtros, favoritos, chat comprador-vendedor, reportes y destacado.
- Beneficios y convenios con filtros por zona, guardados, canje de cupones y panel de redenciones.
- Noticias y novedades con categorias editoriales, articulos destacados, guardado y compartido.
- Emails transaccionales robustos con Resend, reintentos y auditoria persistente de envios.
- Esquema Prisma reforzado con normalizacion de ubicaciones, catalogo de servicios de reserva y perfil publico separado de mascota.
- Panel admin funcional con metricas, gestion de usuarios/mascotas y moderacion operativa centralizada.
- Base de UX endurecida con toasts, skeletons, empty states y shell mobile-first preparado para safe areas y futura transicion a Capacitor.
- Deploy endurecido para Coolify + GitHub con Dockerfiles reproducibles, `.dockerignore`, healthchecks para `api` y `web` y migraciones Prisma automaticas en el arranque del API.
- Base de UI/UX preparada para transicion a Capacitor (mobile-first y safe areas).
#   k u m m p a  
 