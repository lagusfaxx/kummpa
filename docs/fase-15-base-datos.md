# Fase 15 - Base de datos PostgreSQL + Prisma

## Alcance implementado (Paso 21)

- refuerzo del schema Prisma con foco en normalizacion y expansion futura
- modelos formales agregados:
- `BusinessLocation`
- `AppointmentService`
- `PublicPetProfile`
- mantenimiento de relaciones, timestamps e indices consistentes con el resto del dominio

## Normalizacion aplicada

- `BusinessLocation` desacopla direccion, ciudad, coordenadas, horario y telefono operativo de perfiles de negocio
- `AppointmentService` formaliza el catalogo de servicios de cada proveedor y permite reservar por `appointmentServiceId`
- `PublicPetProfile` separa el perfil publico compartible de la identidad de emergencia (`PetPublicIdentity`)

## Integracion en backend

- `apps/api/src/modules/profiles/profiles.service.ts`
- sincroniza `BusinessLocation` al actualizar perfiles `VET`, `CAREGIVER` y `SHOP`
- `apps/api/src/modules/map/map.service.ts`
- consume `BusinessLocation` con fallback a campos legacy
- `apps/api/src/modules/appointments/appointments.service.ts`
- expone catalogo de servicios por proveedor
- permite crear reservas usando `appointmentServiceId`
- mantiene compatibilidad con flujo anterior por `providerType` + `serviceType`
- `apps/api/src/modules/pets/pets.service.ts`
- crea y administra `PublicPetProfile`
- aplica reglas de visibilidad en el perfil publico compartible

## API nueva o ampliada

Base: `/api/v1/appointments`

- `GET /provider/services`
- `PUT /provider/services`
- `POST /` ahora acepta `appointmentServiceId`

Base: `/api/v1/pets`

- `GET /:id/public-profile`
- `PUT /:id/public-profile`
- `GET /public/:shareToken` ahora usa `PublicPetProfile` para visibilidad

## Migracion Prisma

- `prisma/migrations/20260317190000_phase15_schema_normalization/migration.sql`
- compatible con `npx prisma migrate deploy`
