# Fase 7 - Identidad digital de mascota (QR/NFC)

## Alcance implementado

- Perfil publico de emergencia separado del perfil publico general.
- Estado de emergencia configurable:
- `NORMAL`
- `LOST`
- `FOUND`
- `IN_TREATMENT`
- Controles de privacidad por campo para decidir que exponer.
- URL publica unica por `publicToken`.
- QR descargable basado en URL publica.
- Campo `nfcCode` para futura integracion NFC.

## Cambios de base de datos

- Enum nuevo `PetEmergencyStatus`.
- Modelo nuevo `PetPublicIdentity` relacionado 1:1 con `Pet`.
- Incluye:
- datos de contacto secundario
- instrucciones de emergencia
- codigo NFC opcional
- flags de visibilidad por campo

## API agregada

Dentro de `api/v1/pets`:

- `GET /:id/identity` (owner autenticado)
- `PUT /:id/identity` (owner autenticado)
- `GET /public-identity/:publicToken` (publico)

## Web agregada

- `/pets/[id]/identity`: panel de gestion de identidad digital, privacidad, URL y QR.
- `/pets/emergency/[publicToken]`: perfil publico de emergencia.
- Boton directo `QR/NFC` agregado en `/pets/[id]`.

## Migraciones manuales SQL

- `prisma/manual-migrations/20260317_phase6_appointments.sql`
- `prisma/manual-migrations/20260317_phase7_pet_identity.sql`
