# Fase 12 - Beneficios y convenios

## Alcance implementado (Paso 18)

- modulo de beneficios y promociones del ecosistema pet
- listado de descuentos por zona
- filtros por:
- ciudad
- comuna/distrito
- tipo de proveedor (`VET`, `CAREGIVER`, `SHOP`, `GROOMING`, `HOTEL`, `OTHER`)
- destacados
- guardados del usuario
- guardado/quitar guardado de beneficios
- activacion/canje de cupones por usuario
- historial de cupones activados (redenciones)
- panel admin para alta y actualizacion de convenios

## Cambios de base de datos

- Enum `BenefitRedemptionStatus`
- extension de `Benefit` con:
- proveedor, zona, cupon, terminos, landing URL
- control de vigencia/actividad
- control de limite de canjes
- contadores de redenciones
- modelos nuevos:
- `BenefitSave`
- `BenefitRedemption`
- relaciones nuevas en `User`:
- `benefitSaves`
- `benefitRedemptions`

## API (apps/api)

Base: `/api/v1/benefits`

- `GET /`
- `GET /saved`
- `GET /redemptions/me`
- `GET /:benefitId`
- `POST /:benefitId/save`
- `DELETE /:benefitId/save`
- `POST /:benefitId/redeem`
- `POST /` (ADMIN)
- `PATCH /:benefitId` (ADMIN)

## Web (apps/web)

- `/benefits`:
- filtros de convenios
- listado con estado de vigencia
- guardar/quitar guardado
- canjear cupon
- panel de cupones/redenciones del usuario
- formulario admin para crear convenios

## Migracion Prisma

- `prisma/migrations/20260317133000_phase12_benefits/migration.sql`
- compatible con `npx prisma migrate deploy`
