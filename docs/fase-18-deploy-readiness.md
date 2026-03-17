# Fase 18 - Deploy readiness

## Objetivo

Dejar el proyecto realmente listo para desplegar en Coolify desde GitHub, con builds reproducibles, migraciones Prisma automáticas y healthchecks consistentes para `api` y `web`.

## Implementado

### Docker y build reproducible

- se agrego `.dockerignore`
  - excluye `node_modules`, `.next`, `dist`, `.git`, caches y archivos locales
- se actualizaron los Dockerfiles:
  - `apps/api/Dockerfile`
  - `apps/web/Dockerfile`
- ambos ahora usan `npm ci --include=dev`
- ambos copian los `package.json` de workspaces necesarios para que `npm ci` sea determinista en contexto monorepo

### API lista para deploy en Coolify

- nuevo entrypoint en `apps/api/docker-entrypoint.sh`
  - ejecuta `prisma migrate deploy`
  - reintenta si PostgreSQL aun no responde
  - inicia la API solo si la migracion queda aplicada
- `apps/api/src/config/env.ts`
  - acepta `PORT` de plataforma como fallback para `API_PORT`
- `apps/api/src/modules/health/health.router.ts`
  - healthcheck ahora valida conectividad real a base de datos
  - responde `503` si el chequeo de DB falla

### Web lista para deploy en Coolify

- nuevo endpoint de health para Next:
  - `apps/web/src/app/api/health/route.ts`
- `apps/web/Dockerfile`
  - runner explicito con `PORT=3000`
  - `HOSTNAME=0.0.0.0`

### Variables y documentacion

- `.env.example`
  - agrega variables de deploy para migracion automatica
  - documenta `PORT` como variable opcional de plataforma
- `docs/deploy-coolify.md`
  - guia reescrita para fase 18
  - explica `api`, `web`, healthchecks y migraciones automaticas
- `README.md`
  - actualizado a fase 18

## Archivos creados o modificados

- `.dockerignore`
- `.env.example`
- `apps/api/Dockerfile`
- `apps/api/docker-entrypoint.sh`
- `apps/api/src/config/env.ts`
- `apps/api/src/modules/health/health.router.ts`
- `apps/web/Dockerfile`
- `apps/web/src/app/api/health/route.ts`
- `docs/deploy-coolify.md`
- `docs/fase-18-deploy-readiness.md`
- `README.md`

## Migraciones Prisma

- no hubo cambio de schema
- no se creo migracion nueva
- la imagen del API ahora queda preparada para ejecutar `prisma migrate deploy` automaticamente al arrancar

## Validacion

- `npm run db:generate` OK
- `npm run typecheck` OK
- `npm run lint` OK
- `npm run build` OK
- `npx prisma validate --schema prisma/schema.prisma` OK

## Nota

- no se ejecuto un build real de Docker dentro de este entorno
- la validacion quedo hecha a nivel de TypeScript, Next, Prisma y documentacion de deploy
