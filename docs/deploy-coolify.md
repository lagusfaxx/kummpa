# Deploy en Coolify (Fase 18)

Esta guia deja `api` y `web` listas para desplegar desde GitHub en Coolify con PostgreSQL y migraciones Prisma compatibles con `npx prisma migrate deploy`.

## Preparacion previa

1. Sube el repositorio a GitHub.
2. Asegurate de que `prisma/migrations` contiene el historial correcto.
3. Revisa `.env.example` y prepara los secretos reales para produccion.

## Servicio PostgreSQL

1. Crea un servicio PostgreSQL en Coolify.
2. Crea dos bases:
   - `kumpa`
   - `kumpa_shadow`
3. Guarda ambas URLs.

Ejemplo:

```txt
DATABASE_URL=postgresql://user:password@postgres:5432/kumpa?schema=public
SHADOW_DATABASE_URL=postgresql://user:password@postgres:5432/kumpa_shadow?schema=public
```

`SHADOW_DATABASE_URL` sigue siendo necesaria porque el schema Prisma la declara explicitamente.

## Servicio API

Configura un servicio desde Dockerfile:

- `Dockerfile Path`: `apps/api/Dockerfile`
- `Port`: `4000`

Variables recomendadas:

- `NODE_ENV=production`
- `PORT=4000`
- `API_PORT=4000`
- `APP_BASE_URL=https://tu-dominio-web.com`
- `CORS_ORIGIN=https://tu-dominio-web.com`
- `JWT_ACCESS_SECRET=...`
- `JWT_REFRESH_SECRET=...`
- `JWT_ACCESS_EXPIRES_IN=15m`
- `JWT_REFRESH_EXPIRES_IN=7d`
- `EMAIL_VERIFICATION_TOKEN_EXPIRES_IN=24h`
- `PASSWORD_RESET_TOKEN_EXPIRES_IN=1h`
- `VACCINE_DUE_SOON_DAYS=30`
- `REMINDER_DISPATCH_BATCH_LIMIT=100`
- `APPOINTMENT_DEFAULT_DURATION_MINUTES=30`
- `APPOINTMENT_MIN_NOTICE_MINUTES=30`
- `DATABASE_URL=...`
- `SHADOW_DATABASE_URL=...`
- `MAPBOX_ACCESS_TOKEN=...`
- `RESEND_API_KEY=...`
- `EMAIL_FROM=...`
- `LOG_LEVEL=info`
- `PRISMA_MIGRATE_ON_START=true`
- `PRISMA_MIGRATE_MAX_ATTEMPTS=10`
- `PRISMA_MIGRATE_DELAY_SECONDS=5`

Healthcheck recomendado:

- `GET /health`

Comportamiento actual de la imagen:

- usa `npm ci` para build reproducible
- ejecuta `prisma generate` en build
- ejecuta `./node_modules/.bin/prisma migrate deploy --schema prisma/schema.prisma` al arrancar
- reintenta migraciones automaticamente si PostgreSQL aun no esta listo
- expone healthcheck con chequeo real de base de datos

Si prefieres ejecutar migraciones en un job separado, puedes desactivar el arranque automatico con:

```txt
PRISMA_MIGRATE_ON_START=false
```

Fallback manual:

```bash
./node_modules/.bin/prisma migrate deploy --schema prisma/schema.prisma
```

## Servicio Web

Configura un servicio desde Dockerfile:

- `Dockerfile Path`: `apps/web/Dockerfile`
- `Port`: `3000`

Variables recomendadas:

- `NODE_ENV=production`
- `PORT=3000`
- `NEXT_PUBLIC_APP_URL=https://tu-dominio-web.com`
- `NEXT_PUBLIC_API_URL=https://tu-dominio-api.com`
- `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=...`

Healthcheck recomendado:

- `GET /api/health`

Comportamiento actual de la imagen:

- usa `npm ci` para build reproducible
- usa `output: "standalone"` de Next.js
- fija `HOSTNAME=0.0.0.0`
- responde healthcheck liviano desde App Router

## Orden recomendado en Coolify

1. Crea PostgreSQL.
2. Despliega `api`.
3. Verifica `GET /health`.
4. Despliega `web`.
5. Verifica `GET /api/health`.
6. Apunta el dominio web real a `NEXT_PUBLIC_APP_URL`.
7. Apunta el dominio API real a `NEXT_PUBLIC_API_URL`.

## Checklist de salida

- `api` construye desde `apps/api/Dockerfile`
- `web` construye desde `apps/web/Dockerfile`
- `api` aplica migraciones automaticamente con Prisma
- `GET /health` responde `200` con `database: up`
- `GET /api/health` responde `200`
- `web` y `api` usan URLs reales de produccion
- CORS restringido al dominio web real
- secretos fuera del repositorio
- no dependes de `.env` local ni `node_modules` locales para construir imagen
